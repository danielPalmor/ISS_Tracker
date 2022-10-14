
function loadISS() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE', function (data) {

        let issTle = data.slice(11);
        let tempPosition = tleToLla(issTle, new Date());

        let lat = tempPosition.latitude * (180 / Math.PI);
        let lon = tempPosition.longitude * (180 / Math.PI);
        let alt = tempPosition.height * 1000;

        // initialize map at bottom left corner
        $.getJSON(`https://api.wheretheiss.at/v1/coordinates/${lat},${lon}`, function (data) {
            let mapURL = data['map_url'] + "&output=embed";
            document.getElementById('map').src = mapURL;
        });

        // Create Collada 3D iss model
        let position = new WorldWind.Position(lat, lon, alt);
        let colladaLoader = new WorldWind.ColladaLoader(position);

        colladaLoader.init({ dirPath: 'Resources/Models/ISS/' });

        colladaLoader.load('ISS.dae', function (model) {
            model.scale = 3500;
            issLayer.addRenderable(model);
            document.querySelector("#loading").classList.toggle('disappear', true)
            globe.wwd.goTo(new WorldWind.Position(lat, lon, alt * 8));
            globe.wwd.navigator.tilt = ISS_BEST_TILT;
            globe.wwd.navigator.heading = ISS_BEST_HEADING;
        });
        // Add placemark of iss
        let modelPlaceMark = new WorldWind.Placemark(position);
        modelPlaceMark.label = 'Iss (Zarya)';
        issPlacemarkLayer.addRenderable(modelPlaceMark);
    });
}


function loadCosmosSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle', function (data) {
        const dirPath = 'Resources/Models/Space_Debris/White_Dot/';
        const modelDirName = 'dot-white.dae';

        let tempArrOfDebrisTLE = data.slice(11);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('COSMOS 2251 DEB');

        for (let i = 0; i < arrOfDebrisTLE.length; i++) {
            if (i === 55)// unclear why...
                continue

            let position = tleToLla(arrOfDebrisTLE[i], new Date());
            load3DSpaceDebris(position, dirPath, modelDirName, 'COSMOS 2251', cosmosDebrisLayer, cosmosPlacemarkLayer);
        }
    });
}

function loadIridiumSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle', function (data) {
        const dirPath = 'Resources/Models/Space_Debris/Yellow_Dot/';
        const modelDirName = 'dot-yellow.dae';

        let tempArrOfDebrisTLE = data.slice(10);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('IRIDIUM 33 DEB');

        for (let i = 0; i < arrOfDebrisTLE.length; i++) {

            let position = tleToLla(arrOfDebrisTLE[i], new Date());
            load3DSpaceDebris(position, dirPath, modelDirName, 'IRIDIUM 33', iridiumDebrisLayer, iridiumPlacemarkLayer);
        }
    });
}

function loadFengyunSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=1999-025&FORMAT=tle', function (data) {
        const dirPath = 'Resources/Models/Space_Debris/Pink_Dot/';
        const modelDirName = 'dot-pink.dae';

        let tempArrOfDebrisTLE = data.slice(10);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('FENGYUN 1C DEB');

        for (let i = 0; i < arrOfDebrisTLE.length; i++) {

            let position = tleToLla(arrOfDebrisTLE[i], new Date());
            load3DSpaceDebris(position, dirPath, modelDirName, 'FENGYUN 1C', fengyunDebrisLayer, fengyunPlacemarkLayer);
        }
    });
}

function loadRussianCosmosSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=1982-092&FORMAT=tle', function (data) {
        const dirPath = 'Resources/Models/Space_Debris/Orange_Dot/';
        const modelDirName = 'dot-orange.dae';

        let tempArrOfDebrisTLE = data.slice(11);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('COSMOS 1408 DEB');

        for (let i = 0; i < arrOfDebrisTLE.length; i++) {

            let position = tleToLla(arrOfDebrisTLE[i], new Date());
            load3DSpaceDebris(position, dirPath, modelDirName, 'COSMOS 1408', russianCosmosDebrisLayer, russianCosmosPlacemarkLayer);
        }
    });
}

function moveISS() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE', function (data) {
        let issTle = data.slice(11);
        let tempPosition = tleToLla(issTle, new Date());

        let lat = tempPosition.latitude * (180 / Math.PI);
        let lon = tempPosition.longitude * (180 / Math.PI);
        let alt = tempPosition.height * 1000;

        let position = new WorldWind.Position(lat, lon, alt);
        let issModel = issLayer.renderables[0];
        issModel.position = position;
        issPastOrbitLayer.renderables[0].positions.push(position);
        issFutureOrbitLayer.renderables[0].positions.splice(0, 1);

        // update map at bottom left corner every 30 seconds
        if (intervalMapUpdate % 30 === 0 && intervalMapUpdate !== 0) {
            $.getJSON(`https://api.wheretheiss.at/v1/coordinates/${lat},${lon}`, function (data) {
                let mapURL = data['map_url'] + "&output=embed";
                document.getElementById('map').src = mapURL;
            });
        }
        issPlacemarkLayer.renderables[0].position = position;
        futureAndPastIssPositions();
    });
    globe.wwd.redraw();
    intervalMapUpdate++;
}

function futureAndPastIssPositions() {
    $.getJSON('https://api.wheretheiss.at/v1/satellites/25544/tles?format=json', function (data) {

        let issOrbitDisplay;
        if (issOrbitOneDay.enabled)
            issOrbitDisplay = 60 * 24; // display orbits of iss within 24 hours
        else
            issOrbitDisplay = 93; // display one orbit of iss (93 minutes)

        let issTle = `${data['line1']}
        ${data['line2']}`;

        let date, position;
        let positionsOfISSInFuture = [], positionsOfISSInPast = [];

        // push to arrays future and past iss positions 24 hours from its current position
        for (let i = 0; i < issOrbitDisplay; i++) {
            // push past paths
            date = new Date(+(new Date()) - i * 1000 * 60);
            position = tleToLla(issTle, date);
            positionsOfISSInPast.push(new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000));

            // push future paths
            date = new Date(+(new Date()) + i * 1000 * 60);
            position = tleToLla(issTle, date);
            positionsOfISSInFuture.push(new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000));
        }

        issPastOrbitLayer.removeAllRenderables();
        issFutureOrbitLayer.removeAllRenderables();
        let issPastOrbitShape = new WorldWind.ShapeAttributes();
        issPastOrbitShape.outlineColor = WorldWind.Color.RED;
        issPastOrbitLayer.addRenderable(new WorldWind.Path(positionsOfISSInPast, issPastOrbitShape));

        let issFutureOrbitShape = new WorldWind.ShapeAttributes();
        issFutureOrbitShape.outlineColor = WorldWind.Color.GREEN;
        issFutureOrbitLayer.addRenderable(new WorldWind.Path(positionsOfISSInFuture, issFutureOrbitShape));
    });
}

function moveCosmosSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle', function (data) {
        let tempArrOfDebrisTLE = data.slice(11);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('COSMOS 2251 DEB');
        for (let i = 0; i < arrOfDebrisTLE.length; i++) {
            if (i === 55)// unclear why...
                continue

            let position = tleToLla(arrOfDebrisTLE[i], new Date());

            cosmosDebrisLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
            cosmosPlacemarkLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
        }
    });
}

function moveIridiumSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle', function (data) {
        let tempArrOfDebrisTLE = data.slice(10);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('IRIDIUM 33 DEB');
        for (let i = 0; i < arrOfDebrisTLE.length; i++) {
            let position = tleToLla(arrOfDebrisTLE[i], new Date());

            iridiumDebrisLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
            iridiumPlacemarkLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
        }
    });
}

function moveFengyunSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=1999-025&FORMAT=tle', function (data) {
        let tempArrOfDebrisTLE = data.slice(10);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('FENGYUN 1C DEB');
        for (let i = 0; i < arrOfDebrisTLE.length; i++) {
            let position = tleToLla(arrOfDebrisTLE[i], new Date());

            fengyunDebrisLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
            fengyunPlacemarkLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
        }
    });
}

function moveRussianCosmosSpaceDebris() {
    $.get('http://celestrak.org/NORAD/elements/gp.php?GROUP=1982-092&FORMAT=tle', function (data) {
        let tempArrOfDebrisTLE = data.slice(11);
        let arrOfDebrisTLE = tempArrOfDebrisTLE.split('COSMOS 1408 DEB');
        for (let i = 0; i < arrOfDebrisTLE.length; i++) {
            let position = tleToLla(arrOfDebrisTLE[i], new Date());

            russianCosmosDebrisLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
            russianCosmosPlacemarkLayer.renderables[i].position = new WorldWind.Position(position.latitude * (180 / Math.PI),
                position.longitude * (180 / Math.PI), position.height * 1000);
        }
    });
}

/**
 * Translates TLE information to a position in longitude, latitude and altitude
 * 
 * @param {String[]} tleData The tle data to translate
 * @param {Date} date The date of the sattelite's position
 */
function tleToLla(tleData, date) {
    // Initialize the satellite record with this TLE
    let satrec = satellite.twoline2satrec(
        tleData.trim().split('\n')[0].trim(),
        tleData.trim().split('\n')[1].trim()
    );

    // Get the position of the satellite at the given date
    let positionAndVelocity, gmst;

    positionAndVelocity = satellite.propagate(satrec, date);
    gmst = satellite.gstime(date);
    return satellite.eciToGeodetic(positionAndVelocity.position, gmst);
}

/**
 * Loads the 3D Space Debris models
 * @param {*} position The position to place model
 * @param {String} dirPath The path to the model
 * @param {String} placemarkName The space debris name
 * @param {String} modelDirName The model filename
 * @param {*} rendeableLayer The layer to add the model to
 * @param {*} placemarkLayer The layer to add the palcemark to
 */
function load3DSpaceDebris(position, dirPath, modelDirName, placemarkName, rendeableLayer, placemarkLayer) {
    let wwPosition = new WorldWind.Position(position.latitude * (180 / Math.PI),
        position.longitude * (180 / Math.PI), position.height * 1000);

    let colladaLoader = new WorldWind.ColladaLoader(wwPosition);

    colladaLoader.init({ dirPath: dirPath });

    colladaLoader.load(modelDirName, function (model) {
        model.scale = 20000;
        rendeableLayer.addRenderable(model);
    });

    let modelPlaceMark = new WorldWind.Placemark(wwPosition);
    modelPlaceMark.label = placemarkName;
    placemarkLayer.addRenderable(modelPlaceMark);
}

// Coorelate 3D models and placemarks
function combineLabelsAndModels() {
    // iss
    if (issLayer.enabled && labelsLayer.enabled)
        issPlacemarkLayer.enabled = true;
    else
        issPlacemarkLayer.enabled = false;

    // Cosmos 2251
    if (cosmosDebrisLayer.enabled && labelsLayer.enabled)
        cosmosPlacemarkLayer.enabled = true;
    else
        cosmosPlacemarkLayer.enabled = false;
    // Iridium
    if (iridiumDebrisLayer.enabled && labelsLayer.enabled)
        iridiumPlacemarkLayer.enabled = true;
    else
        iridiumPlacemarkLayer.enabled = false;

    //Fengyun
    if (fengyunDebrisLayer.enabled && labelsLayer.enabled)
        fengyunPlacemarkLayer.enabled = true;
    else
        fengyunPlacemarkLayer.enabled = false;

    // Cosmos 1408
    if (russianCosmosDebrisLayer.enabled && labelsLayer.enabled)
        russianCosmosPlacemarkLayer.enabled = true;
    else
        russianCosmosPlacemarkLayer.enabled = false;
}