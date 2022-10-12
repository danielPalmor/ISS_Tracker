function onFirstLoad() {

    "use strict";

    // Set the Bing API key for Bing Maps
    // Without your own key you will be using a limited WorldWind developer's key.
    // See: https://www.bingmapsportal.com/ to register for your own key and then enter it below:
    const BING_API_KEY = "";
    if (BING_API_KEY) {
        // Initialize WorldWind properties before creating the first WorldWindow
        WorldWind.BingMapsKey = BING_API_KEY;
    } else {
        console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
    }
    // Set the MapQuest API key used for the Nominatim service.
    // Get your own key at https://developer.mapquest.com/
    // Without your own key you will be using a limited WorldWind developer's key.
    const MAPQUEST_API_KEY = "";

    /**
     * View model for the layers panel.
     * @param {Globe} globe - Our globe object
     */
    function LayersViewModel(globe) {
        let self = this;
        self.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
        self.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('base').subscribe(newValue =>
            self.loadLayers(globe.getLayers('base'), self.baseLayers));

        globe.getCategoryTimestamp('overlay').subscribe(newValue =>
            self.loadLayers(globe.getLayers('overlay'), self.overlayLayers));

        // Utility to load the layers in reverse order to show last rendered on top
        self.loadLayers = function (layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the layer panel's buttons
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
        };
    }

    /**
     * View model for the settings.
     * @param {Globe} globe - Our globe object (not a WorldWind.Globe)
     */
    function SettingsViewModel(globe) {
        let self = this;
        self.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('setting').subscribe(newValue =>
            self.loadLayers(globe.getLayers('setting'), self.settingLayers));

        // Utility to load layers in reverse order 
        self.loadLayers = function (layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the setting panel's buttons
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
        };
    }

    /**
     * Search view model. Uses the MapQuest Nominatim API. 
     * Requires an access key. See: https://developer.mapquest.com/
     * @param {Globe} globe
     * @param {Function} preview Function to preview the results
     * @returns {SearchViewModel}
     */
    function SearchViewModel(globe, preview) {
        let self = this;
        self.geocoder = new WorldWind.NominatimGeocoder();
        self.searchText = ko.observable('');
        self.performSearch = function () {
            if (!MAPQUEST_API_KEY) {
                console.error("SearchViewModel: A MapQuest API key is required to use the geocoder in production. Get your API key at https://developer.mapquest.com/");
            }
            // Get the value from the observable
            let queryString = self.searchText();
            if (queryString) {
                if (queryString.match(WorldWind.WWUtil.latLonRegex)) {
                    // Treat the text as a lat, lon pair 
                    let tokens = queryString.split(",");
                    let latitude = parseFloat(tokens[0]);
                    let longitude = parseFloat(tokens[1]);
                    // Center the globe on the lat, lon
                    globe.wwd.goTo(new WorldWind.Location(latitude, longitude));
                } else {
                    // Treat the text as an address or place name
                    self.geocoder.lookup(queryString, function (geocoder, results) {
                        if (results.length > 0) {
                            // Open the modal dialog to preview and select a result
                            preview(results);
                        }
                    }, MAPQUEST_API_KEY);
                }
            }
        };
    }

    /**
     * Define the view model for the Search Preview.
     * @param {Globe} primaryGlobe
     * @returns {PreviewViewModel}
     */
    function PreviewViewModel(primaryGlobe) {
        let self = this;
        // Show a warning message about the MapQuest API key if missing
        this.showApiWarning = (MAPQUEST_API_KEY === null || MAPQUEST_API_KEY === "");

        // Create secondary globe with a 2D Mercator projection for the preview
        this.previewGlobe = new Globe("preview-canvas", "Mercator");
        let resultsLayer = new WorldWind.RenderableLayer("Results");
        let bingMapsLayer = new WorldWind.BingRoadsLayer();
        bingMapsLayer.detailControl = 1.25; // Show next level-of-detail sooner. Default is 1.75
        this.previewGlobe.addLayer(bingMapsLayer);
        this.previewGlobe.addLayer(resultsLayer);

        // Set up the common placemark attributes for the results
        let placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/pushpins/castshadow-red.png";
        placemarkAttributes.imageScale = 0.5;
        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.3,
            WorldWind.OFFSET_FRACTION, 0.0);

        // Create an observable array who's contents are displayed in the preview
        this.searchResults = ko.observableArray();
        this.selected = ko.observable();

        // Shows the given search results in a table with a preview globe/map
        this.previewResults = function (results) {
            if (results.length === 0) {
                return;
            }
            // Clear the previous results
            self.searchResults.removeAll();
            resultsLayer.removeAllRenderables();
            // Add the results to the observable array
            results.map(item => self.searchResults.push(item));
            // Create a simple placemark for each result
            for (let i = 0, max = results.length; i < max; i++) {
                let item = results[i];
                let placemark = new WorldWind.Placemark(
                    new WorldWind.Position(
                        parseFloat(item.lat),
                        parseFloat(item.lon), 100));
                placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                placemark.displayName = item.display_name;
                placemark.attributes = placemarkAttributes;
                resultsLayer.addRenderable(placemark);
            }

            // Initialize preview with the first item
            self.previewSelection(results[0]);
            // Display the preview dialog
            $('#preview-dialog').modal();
            $('#preview-dialog .modal-body-table').scrollTop(0);
        };

        // Center's the preview globe on the selection and sets the selected item.
        this.previewSelection = function (selection) {
            let latitude = parseFloat(selection.lat),
                longitude = parseFloat(selection.lon),
                location = new WorldWind.Location(latitude, longitude);
            // Update our observable holding the selected location
            self.selected(location);
            // Go to the posiion
            self.previewGlobe.wwd.goTo(location);
        };

        // Centers the primary globe on the selected item
        this.gotoSelected = function () {
            // Go to the location held in the selected observable
            primaryGlobe.wwd.goTo(self.selected());
        };
    }

    // Create the view models
    let layers = new LayersViewModel(globe);
    let settings = new SettingsViewModel(globe);
    let preview = new PreviewViewModel(globe);
    let search = new SearchViewModel(globe, preview.previewResults);


    // Bind the views to the view models
    ko.applyBindings(layers, document.getElementById('layers'));
    ko.applyBindings(settings, document.getElementById('settings'));
    ko.applyBindings(search, document.getElementById('search'));
    ko.applyBindings(preview, document.getElementById('preview'));


    // Auto-collapse the main menu when its button items are clicked
    $('.navbar-collapse a[role="button"]').click(function () {
        $('.navbar-collapse').collapse('hide');
    });

    // Collapse card ancestors when the close icon is clicked
    $('.collapse .close').on('click', function () {
        $(this).closest('.collapse').collapse('hide');
    });


    loadCosmosSpaceDebris();
    loadFengyunSpaceDebris();
    loadRussianCosmosSpaceDebris();
    loadIridiumSpaceDebris();
    futureAndPastIssPositions(); // initizalize the iss's past and future orbits
    window.setTimeout(loadISS, 10000); // load iss only after everything has finished loading
}