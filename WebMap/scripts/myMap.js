/// <reference path="~\openlayers\OpenLayers.js" />




var MapData = (function ($) {
    "use strict";

    var MapData = {};

    function urlBase() {
       //return "http://localhost:60080/Service1.svc/";
       return "http://www.quilkin.co.uk/Service1.svc/";

    }
    function webRequestFailed(handle, status, error) {
        alert("Web Error: " + error);

    }

    MapData.json = function (url, type, data, successfunc) {
        var thisurl = urlBase() + url;
        if (data === null) {
            $.ajax({
                type: type,
                url: thisurl,
                contentType: 'application/x-www-form-urlencoded',
                success: successfunc,
                error: webRequestFailed
            });
        }
        else {
            var dataJson = JSON.stringify(data);

            $.ajax({
                type: type,
                data: dataJson,
                url: thisurl,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: successfunc,
                error: webRequestFailed
            });
        }
    };

    MapData.jsonMapzen = function (data, successfunc) {
        var dataJson = JSON.stringify(data);
        var url = 'https://valhalla.mapzen.com/route?json=' +  dataJson + '&api_key=valhalla-3F5smze' ;
        
        //var dataJson = "{\"locations\":[{\"lat\":42.358528,\"lon\":-83.271400},{\"lat\":42.996613,\"lon\":-78.749855}]}"
            $.ajax({
                url: url,
                type: "GET",
                contentType: 'application/x-www-form-urlencoded',
                dataType: "json",
                success: successfunc,
                error: webRequestFailed
            });

    };


    return MapData;


}(jQuery));

var myMap = (function ($) {
    "use strict";

    aggressiveEnabled: false;
    // distance to check if on track or not (approx 20 m)
    var near = 0.0002;
    // distance to check if too far from track (appox 500m)
    var far = 0.05;

    var myMap = {},
        map,
        location,
        path,
        aggressiveEnabled,
        locations = [],
        route,
        iconCentre1,
        messageBox,
        legs=[],
        wayPoints = [],
        routePoints = [],
        followedPoints = [],
        nearestPoint = null,
        nextPoint = null,
        onTrack = false,
        lastLine1, lastLine2, lastDem,
        bikeType,
        dialog,dialogContents;

    // Create additional Control placeholders
    function addControlPlaceholders(map) {
        var corners = map._controlCorners,
            l = 'leaflet-',
            container = map._controlContainer;

        function createCorner(vSide, hSide) {
            var className = l + vSide + ' ' + l + hSide;

            corners[vSide + hSide] = L.DomUtil.create('div', className, container);
        }

        createCorner('verticalcenter', 'left');
        createCorner('verticalcenter', 'right');
        createCorner('center', 'left');
        createCorner('center', 'right');

    }
   

    // get the list of points to map
    MapData.json('GetLocations', "POST", null, function (locs) {

        // first point will be the latest one recorded, use this to centre the map
        location = locs[0];
        var options = { timeout: 5000, position: 'bottomleft' }
        map = L.map('map', { messagebox: true }).setView([location.latitude, location.longitude], 14);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
            
        }).addTo(map);


        var index, count = locs.length;
        var now = new Date();
        var reggie = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/;
        var dateArray, dateObj;
        for (index = count - 1; index >= 0; index--)
        {
            
            var loc = locs[index];
            if (loc.latitude != 0) {
                var dt = now;
                // convert SQL date string to EU format
                dateArray = reggie.exec(loc.recorded_at);
                    dt   = new Date(
                    (+dateArray[3]),
                    (+dateArray[2]) - 1, // Careful, month starts at 0!
                    (+dateArray[1]),
                    (+dateArray[4]),
                    (+dateArray[5]),
                    (+dateArray[6])
                );

                var colour = (index === 0) ? 'red' : 'blue';
                if (now.getDate() != dt.getDate())
                    colour = 'gray';

                var circle = L.circle([loc.latitude, loc.longitude], (index === 0) ? 60 : 15, {
                    color: colour,
                    fillColor: colour,
                    fillOpacity: 0.5
                }).addTo(map);
                circle.bindPopup(loc.recorded_at);
            }
        }
        AddControls();


    }, true, null);

    function AddControls() {

        addControlPlaceholders(map);

        L.control.mousePosition().addTo(map);

        // a cross-hair for choosing points
        iconCentre1 = L.control({ position: 'centerleft' });
        iconCentre1.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'myControl');
            var img_log = "<div><img src=\"images/crosshair.png\"></img></div>";
            this._div.innerHTML = img_log;
            return this._div;

        }
        iconCentre1.addTo(map);

        dialogContents = [
         "<p>Quilkin cycle router: Options</p>",
         "<button class='btn btn-primary' onclick='myMap.changeBike()'>Bike Type: Hybrid</button><br/><br/>",
          "<button class='btn btn-primary' onclick='myMap.changeHills()'>Hill use (0-9): 5</button><br/><br/>",
          "<button class='btn btn-primary' onclick='myMap.changeMainRoads()'>Main Road use (0-9): 2</button><br/><br/>",
         //"<button class='btn btn-danger' onclick='dialog.freeze()'>dialog.freeze()</button>&nbsp;&nbsp;",
         //"<button class='btn btn-success' onclick='dialog.unfreeze()'>dialog.unfreeze()</button><br/><br/>",
        ].join('');

        dialog = L.control.dialog()
                  .setContent(dialogContents)
                  .addTo(map);

        L.easyButton('<span class="bigfont">&rarr;</span>', createRoute).addTo(map);
        L.easyButton('<span class="bigfont">&check;</span>', addPoint).addTo(map);
        L.easyButton('<span class="bigfont">&cross;</span>', deletePoint).addTo(map);
        L.easyButton('<span class="bigfont">&odot;</span>', openDialog).addTo(map);
        bikeType = "Hybrid";
        //map.messagebox.options.timeout = 5000;
        //map.messagebox.setPosition('topleft');
        //map.messagebox.show(bikeType);


    }

    function addPoint() {
        var centre = map.getCenter();

        if (route == undefined) {
            wayPoints.push(L.latLng(location.latitude, location.longitude));
            wayPoints.push(L.latLng(centre.lat, centre.lng));
            createRoute();
            return;
        }
        wayPoints.push(L.latLng(centre.lat, centre.lng));
        createRoute();
        
    }
    function deletePoint()
    {
        if (wayPoints.length < 2) {
            alert("No waypoints to delete!")
            return;
        }
        wayPoints.pop();
        createRoute();
    }
    function openDialog() {
        dialog.open();
    }
    myMap.changeBike = function()
    {
        switch (bikeType) {
            case 'Hybrid': bikeType = 'Cross'; dialogContents = dialogContents.replace("Hybrid", "Cross"); break;
            case 'Cross': bikeType = 'Mountain'; dialogContents = dialogContents.replace("Cross", "Mountain"); break;
            case 'Mountain': bikeType = 'Road'; dialogContents = dialogContents.replace("Mountain", "Road"); break;
            case "Road": bikeType = 'Hybrid'; dialogContents = dialogContents.replace("Road", "Hybrid"); break;
        }
        dialog.setContent(dialogContents);
        dialog.update();
               //map.messagebox.show(bikeType);
        if (wayPoints.length >= 2)
            createRoute();
    }
    myMap.changeMainRoads = function () {
        //ToDo
    }
    myMap.changeHills = function () {
        //ToDo
    }
    // Code from Mapzen site
    function polyLineDecode(str, precision) {
        var index = 0,
            lat = 0,
            lng = 0,
            coordinates = [],
            shift = 0,
            result = 0,
            byte = null,
            latitude_change,
            longitude_change,
            factor = Math.pow(10, precision || 6);

        // Coordinates have variable length when encoded, so just keep
        // track of whether we've hit the end of the string. In each
        // loop iteration, a single coordinate is decoded.
        while (index < str.length) {

            // Reset shift, result, and byte
            byte = null;
            shift = 0;
            result = 0;

            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

            shift = result = 0;

            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

            lat += latitude_change;
            lng += longitude_change;

            coordinates.push([lat / factor, lng / factor]);
        }

        return coordinates;
    };

    function createRoute()
    {
        if (wayPoints.length < 2)
        {
            alert("No waypoints added!")
            return;
        }
        //var centre = map.getCenter();
        if (route != undefined)
            route.removeFrom(map);
        route = L.Routing.control({
            waypoints: wayPoints,
            router: L.Routing.mapzen('valhalla-3F5smze',
                {
                    costing: 'bicycle',
                    costing_options: { bicycle: { bicycle_type: bikeType } }
                }
                ),
            formatter: new L.Routing.mapzenFormatter(),
            summaryTemplate: '<div class="start">{name}</div><div class="info {costing}">{distance}, {time}</div>',
            routeWhileDragging: false
        }).addTo(map);

        var data = {
            locations: [{ lat: wayPoints[0].lat, lon: wayPoints[0].lng }, { lat: wayPoints[1].lat, lon: wayPoints[1].lng }],
            //locations:points,
            costing: "bicycle"
           // locations: points
        }
        MapData.jsonMapzen(data,getRoute);
       
    }

    function getRoute(response) {
        var maneuvers = [];

        legs = response.trip.legs;
        // get the written / spoken instructions
        for (var i = 0; i < response.trip.legs.length; i++) {
            for (var j = 0; j < response.trip.legs[i].maneuvers.length; j++) {
                var maneuver = response.trip.legs[i].maneuvers[j];
                var instruction = maneuver.verbal_pre_transition_instruction;
                var shapeIndex = maneuver.begin_shape_index;
                maneuvers.push([i, shapeIndex, instruction ]);
                //responsiveVoice.speak(instruction);
                //break;
            }
        }
        // get the list of locations passed through
        routePoints = [];
        followedPoints = [];
        nearestPoint = null;
        onTrack = false;
        for (var i = 0; i < legs.length; i++) {
            //for (var j = 0; j < legs[i].maneuvers.length; j++) {
            var pline = legs[i].shape;
            var locations = polyLineDecode(pline, 6);

            for (var loc = 0; loc < locations.length; loc++) {
                // save points passed through, and the legs/maneuvers they are stored in
                var p1 = locations[loc][0], p2 = locations[loc][1];
                routePoints.push([p1, p2, i, loc]);
                
            }
        }
    }
    function pointToLine(point0,line1,line2) {
        // find min distance from point0 to line defined by points line1 and line2
        var numer,dem;
        var x1 = line1[0], x2 = line2[0], x0 = point0[0];
        var y1 = line1[1], y2 = line2[1], y0 = point0[1];
        
        if (line1===lastLine1 && line2 === lastLine2) {
            // same line as we checked before, can save time by not recalculating sqaure root on demoninator
            dem = lastDem;
        }
        else {
            dem = Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
            lastLine1 = line1;
            lastLine2 = line2;
            lastDem = dem;
        }
        numer =  Math.abs((y2-y1)*x0 - (x2-x1)*y0 + x2*y1 - y2*x1);
        return numer / dem;

    }
    myMap.checkInstructions = function (lat, lon) {
        var thisPoint = [lat, lon];
        followedPoints.push(thisPoint);
        if (nearestPoint === null && onTrack === false) {
            // Nowhere near?. Check point against all points in the route
            for (var loc = 0; loc < routePoints.length; loc++) {
                var point = routePoints[loc];
                // within 20 metres (approx)?
                if (Math.abs(point[0] - lat) < near) {
                    if (Math.abs(point[1] - lon) < near) {
                        nearestPoint = point;
                        if (loc < routePoints.length - 1)
                            nextPoint = routePoints[loc + 1];
                        else
                            nextPoint = nearestPoint;
                        onTrack = true;
                        break;
                    }
                }
            }
        }
        else {
            // we are (or were) on track, see how far we are from the nearest route segment (line)
            
            var distance = pointToLine(thisPoint, nearestPoint, nextPoint);
            onTrack = (distance < near);

            if (distance >= far) {
                // too far off track, need to start looking for track again
                nearestPoint = null;
            }
        }
        if (onTrack) {
            // find the appropriate instruction to provide
            var i = nearestPoint[2], j = nearestPoint[3];
            var maneuver = legs[i].maneuvers[j];
            var instruction = maneuver.verbal_pre_transition_instruction;
            responsiveVoice.speak(instruction);
        }
        return (onTrack);
    }
    return myMap
})(jQuery)
