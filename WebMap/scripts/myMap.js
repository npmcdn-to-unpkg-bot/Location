/// <reference path="~\openlayers\OpenLayers.js" />


var ENV = (function() {
    
    var localStorage = window.localStorage;

    return {
        settings: {
            /**
            * state-mgmt
            */
            enabled:    localStorage.getItem('enabled')     || 'true',
            aggressive: localStorage.getItem('aggressive')  || 'false'
        },
        toggle: function(key) {
            var value       = localStorage.getItem(key)
            newValue    = ((new String(value)) == 'true') ? 'false' : 'true';

            localStorage.setItem(key, newValue);
            return newValue;
        }
    }
})()

var MapData = (function ($) {
    "use strict";

    var MapData = {};

    function urlBase() {
        return "http://localhost:60080/Service1.svc/";
        //return "http://www.quilkin.co.uk/Service1.svc/";

    }
    function webRequestFailed(handle, status, error) {
        alert("Web Error: " + error);
        //$("#submitButton").removeAttr("disabled");
    }

    MapData.json = function (url, type, data, successfunc) {
        var dataJson = JSON.stringify(data),
            thisurl = urlBase() + url;
        $.ajax({
            type: type,
            data: dataJson,
            url: thisurl,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            async: true,
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
        locations = [];

    
    //var dateTimeReviver = function (key, value) {
    //    var a;
    //    if (typeof value === 'string') {
    //        a = /\/Date\((\d*)\)\//.exec(value);
    //        if (a) {
    //            return new Date(+a[1]);
    //        }
    //    }
    //    return value;
    //}

    // get the list of points to map
    MapData.json('GetLocations', "POST", null, function (locs) {
        //$.each(locs, function (index, loc) {
        //    if (loc.latitude != 0)
        //        locations.push(loc);

        //});
        // first point will be the latest one recorded, use this to centre the map
        location = locs[0];
        map = L.map('map').setView([location.latitude, location.longitude], 13);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);

        var index, count = locs.length;
        for (index = count - 1; index >= 0; index--)
        //$.each(locations, function (index, loc)
        {
            
            var loc = locs[index];
            if (loc.latitude != 0) {
                var dt = new Date(loc.recorded_at);

                var circle = L.circle([loc.latitude, loc.longitude], (index === 0) ? 100 : 20, {
                    color: (index === 0) ? 'yellow' : 'blue',
                    //fillColor: '#f03',
                    fillOpacity: 0.5
                }).addTo(map);
                circle.bindPopup(loc.recorded_at);
            }
        }

        
    }, true, null);




   

    //function onLocationFound(e) {
    //    var radius = e.accuracy / 2;

    //    L.marker(e.latlng).addTo(map)
    //        .bindPopup("You are within " + radius + " meters from this point").openPopup();

    //    L.circle(e.latlng, radius).addTo(map);
    //}
    //function onLocationError(e) {
    //    alert(e.message);
    //}

    //function watchPosition() {
    //    var fgGeo = window.navigator.geolocation;
    //    if (watchId) {
    //        stopPositionWatch();
    //    }
    //    // Watch foreground location
    //    watchId = fgGeo.watchPosition(function(location) {
    //        setCurrentLocation(location.coords);
    //    }, function() {}, {
    //        enableHighAccuracy: true,
    //        maximumAge: 5000,
    //        frequency: 10000,
    //        timeout: 10000
    //    });
    //};
    //function stopPositionWatch() {
    //    var fgGeo = window.navigator.geolocation;
    //    if (watchId) {
    //        fgGeo.clearWatch(watchId);
    //        watchId = undefined;
    //    }
    //};
    //function setCurrentLocation(location) {
    //    if (location === undefined) {
    //        location = L.marker(e.latlng).addTo(map)
    //        //location = new google.maps.Marker({
    //        //    map: app.map,
    //        //    icon: {
    //        //        path: google.maps.SymbolPath.CIRCLE,
    //        //        scale: 3,
    //        //        fillColor: 'blue',
    //        //        strokeColor: 'blue',
    //        //        strokeWeight: 5
    //        //    }
    //        //});
    //        app.locationAccuracy = new google.maps.Circle({
    //            fillColor: '#3366cc',
    //            fillOpacity: 0.4,
    //            strokeOpacity: 0,
    //            map: app.map
    //        });
    //    }
    //    if (!app.path) {
    //        app.path = new google.maps.Polyline({
    //            map: app.map,
    //            strokeColor: '#3366cc',
    //            fillOpacity: 0.4
    //        });
    //    }
    //    var latlng = new google.maps.LatLng(location.latitude, location.longitude);
        
    //    if (app.previousLocation) {
    //        var prevLocation = app.previousLocation;
    //        // Drop a breadcrumb of where we've been.
    //        app.locations.push(new google.maps.Marker({
    //            icon: {
    //                path: google.maps.SymbolPath.CIRCLE,
    //                scale: 3,
    //                fillColor: 'green',
    //                strokeColor: 'green',
    //                strokeWeight: 5
    //            },
    //            map: app.map,
    //            position: new google.maps.LatLng(prevLocation.latitude, prevLocation.longitude)
    //        }));
    //    }

    //    // Update our current position marker and accuracy bubble.
    //    app.location.setPosition(latlng);
    //    app.locationAccuracy.setCenter(latlng);
    //    app.locationAccuracy.setRadius(location.accuracy);

    //    // Add breadcrumb to current Polyline path.
    //    app.path.getPath().push(latlng);
    //    app.previousLocation = location;
    //}


    return myMap
})(jQuery)
