/// <reference path="~\openlayers\OpenLayers.js" />


//var ENV = (function() {
    
//    var localStorage = window.localStorage;

//    return {
//        settings: {
//            /**
//            * state-mgmt
//            */
//            enabled:    localStorage.getItem('enabled')     || 'true',
//            aggressive: localStorage.getItem('aggressive')  || 'false'
//        },
//        toggle: function(key) {
//            var value       = localStorage.getItem(key)
//            newValue    = ((new String(value)) == 'true') ? 'false' : 'true';

//            localStorage.setItem(key, newValue);
//            return newValue;
//        }
//    }
//})()

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

    var myMap = {},
        map,
        location,
        path,
        aggressiveEnabled,
        locations = [],
            route,
            iconCentre1,
                iconCentre2,
                points=[];

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
        map = L.map('map').setView([location.latitude, location.longitude], 14);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);

        addControlPlaceholders(map);

        iconCentre1 = L.control({ position: 'centerleft' });
        iconCentre1.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'myControl');
            var img_log = "<div><img src=\"images/crosshair.png\"></img></div>";
            this._div.innerHTML = img_log;
            return this._div;

        }
        iconCentre1.addTo(map);

        L.easyButton('<span >&rarr;</span>', createRoute).addTo(map);
        L.easyButton('<span >&check;</span>', addPoint).addTo(map);
        L.easyButton('<span >&cross;</span>', deletePoint).addTo(map);

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



    }, true, null);

    function addPoint() {
        var centre = map.getCenter();

        if (route == undefined) {
            points.push(L.latLng(location.latitude, location.longitude));
            points.push(L.latLng(centre.lat, centre.lng));
            createRoute();
            return;
        }
        points.push(L.latLng(centre.lat, centre.lng));
        createRoute();
        
    }
    function deletePoint()
    {
        if (points.length < 2) {
            alert("No waypoints to delete!")
            return;
        }
        points.pop();
        createRoute();
    }
    function createRoute()
    {
        if (points.length < 2)
        {
            alert("No waypoints added!")
            return;
        }
        //var centre = map.getCenter();
        if (route != undefined)
            route.removeFrom(map);
        route = L.Routing.control({
            waypoints: points,
            router: L.Routing.mapzen('valhalla-3F5smze',
                {
                    costing: 'bicycle',
                    costing_options: { bicycle: { bicycle_type: 'Mountain' } }
                }
                ),
            formatter: new L.Routing.mapzenFormatter(),
            summaryTemplate: '<div class="start">{name}</div><div class="info {costing}">{distance}, {time}</div>',
            routeWhileDragging: false
        }).addTo(map);

        var data = {
            locations: [{ lat: points[0].lat, lon: points[0].lng }, { lat: points[1].lat, lon: points[1].lng }],
            //locations:points,
            costing: "bicycle"
           // locations: points
        }
        MapData.jsonMapzen(data,getRoute);

        function getRoute(route) {
            var r = route;
        }
    }
   
    return myMap
})(jQuery)
