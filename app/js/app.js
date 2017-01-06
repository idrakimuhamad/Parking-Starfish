// GOOGLE MAPS API V3
// https://developers.google.com/maps/documentation/javascript/examples/

var map, userCoord, directionsService, directionDisplay, radius, userMarker, queryTimeout;
var markers = [];

// initialize the google map service and map
function initialize() {
    userCoord = new google.maps.LatLng(3.071087, 101.501837);
    var mapOptions = {
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: userCoord,
        disableDefaultUI: true
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    directionsService = new google.maps.DirectionsService;
    directionDisplay = new google.maps.DirectionsRenderer;

    directionDisplay.setMap(map);
}

// trigger the initialize function on window load
google.maps.event.addDomListener(window, 'load', initialize);

// simulate the initial search page interaction and animation
var initiateSearchPage = function() {
    $('body').addClass('search-page');
    $('.welcome').addClass('fadeOutUp');

    setTimeout(function() {
        $('.app-options').removeClass('hidden');
        lookupCurrent();
    }, 1500);

    setTimeout(function() {
        $('.overlay').addClass('fadeOut');
        $('.app-header').removeClass('hidden');
    }, 500);

    setTimeout(function() {
        $('.map-container').addClass('on-top in-app');
        $('.loading-container').removeClass('hidden');
        $('.loading-current-position').removeClass('hidden');
    }, 2000);
};

// simulate the process of getting current position
var lookupCurrent = function() {
    setTimeout(function() {
        userMarkerCircle(240)
    }, 4500);
};

// mark the user position
var userMarkerCircle = function(rad) {
    $('.loading-inner').addClass('fadeOutUp');

    setTimeout(function() {
        $('.loading-current-position').addClass('hidden');
        $('.loading-container').addClass('hidden');
    }, 1000);

    userMarker = new google.maps.Marker({
        position: userCoord,
        map: map,
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 2
        },
        title: 'Your location'
    });

    radius = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.05,
        map: map,
        center: userCoord,
        radius: rad
    });

    // resize the map and pan to user position
    google.maps.event.trigger(map, 'resize');
    map.panTo(userCoord);

    $('.logo-container').toggleClass('loading');

    // search for the parking
    setTimeout(function() {
        searchForParking(rad);
    }, 3000);
};

// draw the selected radius
var drawRadius = function(rad) {
    $('.radius-input').removeClass('hidden');
    $('.loading-current-position').addClass('hidden');
    var radiusToQuery = +rad || 240;

    radius.setRadius(Number(radiusToQuery))

    google.maps.event.trigger(map, 'resize');
    map.panTo(userCoord);
};


// search the parking, make the API and create the marker
var searchForParking = function(radius) {
    // query from DB in AJAX
    var parkingRespond = requestAPI(radius);

    parkingRespond.done(function(data) {
        if (data) {
            var parkingData = data.parkings;

            if (parkingData.length) {
                parkingData.forEach(function(parking, i) {
                  // check if the parking space is > 0
                  if (parking.Parking_Availability > 0) {
                    window.setTimeout(function() {
                        var coord = new google.maps.LatLng(parking.Coordinate_Lat, parking.Coordinate_Lng);
                        var marker = new google.maps.Marker({
                            position: coord,
                            map: map,
                            animation: google.maps.Animation.DROP,
                            title: parking.Location,
                            icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + parking.Parking_Availability + '|3367D6|ffffff'
                        });

                        marker.addListener('click', function() {
                            calculateRoute(userCoord, coord);
                            $('.app-location-details').removeClass('hidden')
                                .find('.parking-place').text(parking.Location + ' (' + parking.Parking_Availability + ' spots available)');
                        });

                        markers.push(marker);
                    }, i * 300);
                  }
                });
            }
        }
        $('.logo-container').toggleClass('loading');
    });
};

// calculate the route for selected marker
var calculateRoute = function(origin, destination) {
    directionDisplay.setMap(map);

    // hide all markers
    clearMarkers(null);

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: 'DRIVING'
    }, function(response, status) {
      if (status === 'OK') {
        directionDisplay.setDirections(response);
      } else {
        console.error('Directions request failed due to ' + status);
      }
    });
};

// clear the currently selected direction
var clearRoute = function() {
    directionDisplay.setMap(null);

    // show back the markers
    showMarkers();

    // zoom to the default position and pan to user position
    map.setZoom(16);
    map.panTo(userCoord);

    $('.app-location-details').addClass('hidden')
        .find('.parking-place').text('');
};

// clear any user radius drawn
var clearRadius = function() {
    radius && radius.setMap(null);
};

// clear all markers (hidden, not delete)
var clearMarkers = function(arg) {
    if (markers.length) {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(arg);
        }
    }
};

// show any existing markers
var showMarkers = function() {
  if (markers.length) {
      for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(map);
      }
  }
}

// remove all markers
var destroyMarkers = function() {
  clearMarkers();
  markers = [];
}

// clear user marker
var clearUser = function() {
    userMarker && userMarker.setMap(null);
};

// make the API request
var requestAPI = function(radius) {
    var coord = {
        lat: 3.071087,
        lng: 101.501837
    };
    var endpoint = 'http://localhost:8080/goNpark/src/api/phpsqlsearch_parkingJSON.php?lat='
                    + coord.lat + '&lng=' + coord.lng + '&radius=' + radius;

    return $.ajax({
        method: "GET",
        url: "http://localhost:3000/js/data.json"
    })
}

// document ready specific function, event listener etc
$(document).ready(function() {
    var defaultRadius = $('#radius').val();
    $('.radius-value').text(defaultRadius);

    $('.get-started').on('click', function(e) {
        e.preventDefault();
        initiateSearchPage();
    });

    $('#radius').on('input', function(e) {
        e.preventDefault();
        var radius = $(e.target).val();

        $('.radius-value').text(radius);

        destroyMarkers();
        drawRadius(radius);
    });

    $('#radius').on('change', function(e) {
        e.preventDefault();
        var radius = $(e.target).val();

        $('.radius-value').val(radius);

        if (queryTimeout) window.clearTimeout(queryTimeout);

        $('.logo-container').toggleClass('loading');
        queryTimeout = setTimeout(function() {
            searchForParking(radius);
        }, 1500);
    });

    $('.close-details').on('click', function(e) {
        e.preventDefault();
        clearRoute();
    })
});
