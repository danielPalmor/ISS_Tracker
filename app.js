const ISS_BEST_TILT = 80;
const ISS_BEST_HEADING = 0;
let intervalMapUpdate = 0; // used in moveIss()

// Create a globe
let globe = new Globe("globe-canvas");

// Add layers to the globe 
// Add layers ordered by drawing order: first to last
globe.addLayer(new WorldWind.BMNGLayer(), {
    category: "base"
});

globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
    category: "base",
    enabled: false
});

globe.addLayer(new WorldWind.BingAerialLayer(), {
    category: "base",
    enabled: false
});

globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
    category: "base",
    enabled: false,
    detailControl: 1.5
});

globe.addLayer(new WorldWind.BingRoadsLayer(), {
    category: "base",
    enabled: false,
    detailControl: 1.5,
    opacity: 0.75
});

globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
    category: "setting"
});

globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
    category: "setting"
});

globe.addLayer(new WorldWind.CompassLayer(), {
    category: "setting",
    enabled: true
});

let starFieldLayer = new WorldWind.StarFieldLayer();
globe.addLayer(starFieldLayer, {
    category: "setting",
    displayName: "Stars",
    time: new Date()
});

atmosphereLayer = new WorldWind.AtmosphereLayer();
globe.addLayer(atmosphereLayer, {
    category: "setting",
    time: new Date()
});

issOrbitOneDay = new WorldWind.RenderableLayer("Iss Orbit 24 Hours Range");
globe.addLayer(issOrbitOneDay, {
    category: "setting",
    enabled: false
});

let labelsLayer = new WorldWind.RenderableLayer('Display Labels');
globe.addLayer(labelsLayer, {
    category: 'setting',
    enabled: false
});

let mapLayer = new WorldWind.RenderableLayer("2D Map Of The Iss Location");
globe.addLayer(mapLayer, {
    category: 'setting',
});

let spotIssLayer = new WorldWind.RenderableLayer('Spot The Iss');
globe.addLayer(spotIssLayer, {
    category: 'setting',
});

let cosmosDebrisLayer = new WorldWind.RenderableLayer("Cosmos 2251 Space Debris");
globe.addLayer(cosmosDebrisLayer, {
    enabled: false
});

let iridiumDebrisLayer = new WorldWind.RenderableLayer("Iridium Space Debris");
globe.addLayer(iridiumDebrisLayer, {
    enabled: false
});

let fengyunDebrisLayer = new WorldWind.RenderableLayer("Fengyun Space Debris");
globe.addLayer(fengyunDebrisLayer, {
    enabled: false
});

let russianCosmosDebrisLayer = new WorldWind.RenderableLayer("Cosmos 1408 Space Debris");
globe.addLayer(russianCosmosDebrisLayer, {
    enabled: false
});

let issPastOrbitLayer = new WorldWind.RenderableLayer("Iss Orbit Past Path");
globe.addLayer(issPastOrbitLayer);

let issFutureOrbitLayer = new WorldWind.RenderableLayer("Iss Orbit Future Path");
globe.addLayer(issFutureOrbitLayer);

let issLayer = new WorldWind.RenderableLayer("Iss (Zarya)");
globe.addLayer(issLayer);

let cosmosPlacemarkLayer = new WorldWind.RenderableLayer('Cosmos 2251 Placemarks');
globe.wwd.addLayer(cosmosPlacemarkLayer, {
    enabled: false
});

let iridiumPlacemarkLayer = new WorldWind.RenderableLayer('Iridium Placemarks');
globe.wwd.addLayer(iridiumPlacemarkLayer, {
    enabled: false
});

let fengyunPlacemarkLayer = new WorldWind.RenderableLayer('Fengyun Placemarks');
globe.wwd.addLayer(fengyunPlacemarkLayer, {
    enabled: false
});

let russianCosmosPlacemarkLayer = new WorldWind.RenderableLayer('Cosmos 1408 Placemarks');
globe.wwd.addLayer(russianCosmosPlacemarkLayer, {
    enabled: false
});

let issPlacemarkLayer = new WorldWind.RenderableLayer('Iss (Zarya) Placemark');
globe.wwd.addLayer(issPlacemarkLayer, {
    enabled: false
});

document.addEventListener('DOMContentLoaded', onFirstLoad);

window.setInterval(moveISS, 1000);

window.setInterval(moveCosmosSpaceDebris, 10000);

window.setInterval(moveIridiumSpaceDebris, 10000);

window.setInterval(moveFengyunSpaceDebris, 10000);

window.setInterval(moveRussianCosmosSpaceDebris, 10000);

document.addEventListener('click', () => {

    // Handle embeded map enabled/disabled modes
    if (mapLayer.enabled) {
        document.getElementById("map").style.display = "block";
        $('.spot-the-station').css('bottom', 0 + "%");
        $('.spot-the-station').css('left', 66.7 + "%");
    }
    else {
        document.getElementById("map").style.display = "none";
        $('.spot-the-station').css('bottom', 0 + "%");
        $('.spot-the-station').css('left', 81 + "%");
    }

    // Handle embeded Spot The Station enabled/disabled modes
    if (spotIssLayer.enabled)
        document.getElementById("spot-iss").style.display = "block";
    else
        document.getElementById("spot-iss").style.display = "none";

    combineLabelsAndModels();

})

// The iss location button
document.getElementById('iss-location').addEventListener('click', () => {
    $.getJSON('https://api.wheretheiss.at/v1/satellites/25544', function (data) {
        let lat = data['latitude'];
        let lon = data['longitude'];
        let alt = data['altitude'] * 1000;
        globe.wwd.goTo(new WorldWind.Position(lat, lon, alt * 8))
        globe.wwd.navigator.tilt = ISS_BEST_TILT;
        globe.wwd.navigator.heading = ISS_BEST_HEADING;
    });
});