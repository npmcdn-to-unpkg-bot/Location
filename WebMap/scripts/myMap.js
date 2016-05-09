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
       // return "http://localhost:60080/Service1.svc/";
       return "http://www.quilkin.co.uk/Service1.svc/";

    }
    function webRequestFailed(handle, status, error) {
        alert("Web Error: " + error);

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

    

    // get the list of points to map
    MapData.json('GetLocations', "POST", null, function (locs) {

        // first point will be the latest one recorded, use this to centre the map
        location = locs[0];
        map = L.map('map').setView([location.latitude, location.longitude], 13);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);

        var index, count = locs.length;
        for (index = count - 1; index >= 0; index--)
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


   
    return myMap
})(jQuery)
