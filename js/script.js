function initGeomapViewer(mapId, mapConfig) {
  const attributionVal = {
    en: "© His Majesty the King in Right of Canada, as represented by Canada Mortgage and Housing Corporation",
    fr: "© Sa Majesté le Roi du Chef du Canada, représenté par la Société canadienne d'hypothèques et de logement",
  };

  /** start of config loading */
  function validateConfig() {
    if (!mapConfig) {
      mapConfig = {};
      console.log("No config provided, using defaults");
    }

    if (!mapConfig.language) {
      mapConfig.language = "en";
      console.log("No language provided, using default 'en'");
    }

    if (!mapConfig.map) {
      mapConfig.map = {};
      console.log("No mapConfig.map provided, using defaults");
    }

    if (!mapConfig.map.zoom) {
      mapConfig.map.zoom = 3;
      console.log("No mapConfig.map.zoom provided, using default '3'");
    }

    if (!mapConfig.map.projection) {
      mapConfig.map.projection = 3857;
      console.log("No mapConfig.map.projection provided, using default '3857'");
    }

    if (!mapConfig.map.center) {
      mapConfig.map.center = [50, -100];
      console.log("No mapConfig.map.center provided, using default '50, -100'");
    }

    if (!mapConfig.map.basemap) {
      mapConfig.map.basemap = {};
      console.log("No mapConfig.map.basemap provided, using defaults");
    }

    if (!mapConfig.map.basemap.id) {
      mapConfig.map.basemap.id = "osm";
      console.log("No mapConfig.map.basemap.id provided, using default 'osm'");
    }

    if (!mapConfig.map.basemap.shaded) {
      mapConfig.map.basemap.shaded = false;
      console.log(
        "No mapConfig.map.basemap.shaded provided, using default 'false'"
      );
    }

    if (!mapConfig.map.basemap.labeled) {
      mapConfig.map.basemap.labeled = true;
      console.log(
        "No mapConfig.map.basemap.labeled provided, using default 'true'"
      );
    }
  }

  validateConfig();
  /** end of config loading */

  /**
   * start projection loading
   */

  function getProjection(epsg) {
    let projection = L.CRS.EPSG3857;
    if (epsg === 3978) {
      projection = getLCCProjection();
    }

    return projection;
  }

  function getLCCProjection() {
    // tile layer extent, expressed in local projection (xmin-left, ymin-bottom, xmax-right, ymax-top)
    const bbox = [-6211271, -5367092, 5972815, 4761177];

    // tile layer scale and resolution
    const scale = [
      145000000, 85000000, 50000000, 30000000, 17500000, 10000000, 6000000,
      3500000, 2000000, 1200000, 700000, 420000, 250000, 145000, 85000, 50000,
      30000, 17500, 10000, 6000,
    ];
    const resolutions = [
      38364.660062653464, 22489.62831258996, 13229.193125052918,
      7937.5158750317505, 4630.2175937685215, 2645.8386250105837,
      1587.5031750063501, 926.0435187537042, 529.1677250021168,
      317.50063500127004, 185.20870375074085, 111.12522225044451,
      66.1459656252646, 38.36466006265346, 22.48962831258996,
      13.229193125052918, 7.9375158750317505, 4.6302175937685215,
      2.6458386250105836, 1.5875031750063502,
    ];

    // transformation matrix
    // TODO: check if the transformation matrix is required
    const transformation = () => {
      const scaleIn = 0.5 / (Math.PI * 6378137);
      return new L.Transformation(scaleIn, 0.5, -scaleIn, 0.5);
    };

    const p1 = L.point(bbox[1], bbox[0]); // minx, miny
    const p2 = L.point(bbox[3], bbox[2]); // maxx, maxy

    // LCC projection
    const projection = new L.Proj.CRS(
      "EPSG:3978",
      "+proj=lcc +lat_1=49 +lat_2=77 +lat_0=49 +lon_0=-95 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
      {
        resolutions,
        origin: [-3.46558e7, 3.931e7],
        bounds: L.bounds(p1, p2),
        transformation,
        scale,
      }
    );

    return projection;
  }

  // define 3978 projection
  proj4.defs(
    "EPSG:3978",
    "+proj=lcc +lat_1=49 +lat_2=77 +lat_0=49 +lon_0=-95 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
  );

  /**
   * end projection loading
   */

  /**
   * Begin map loading
   */

  var mapElement = document.getElementById(mapId);

  var map = L.map(mapId, {
    crs: getProjection(mapConfig.map.projection),
  }).setView([50, -100], 3);
  mapElement.setAttribute("tabindex", "0");

  map.attributionControl.setPrefix("");
  map.attributionControl.setPosition("bottomleft");
  map.zoomControl.setPosition("bottomright");

  // Add keydown event listener to the map
  map.getContainer().addEventListener("keydown", function (event) {
    prevClickedMarker.style.zIndex = 1000;

    if (event.key === "Escape" && !panelOpen) {
      map.getContainer().focus();
    }
  });

  /**
   * End map loading
   */

  /**
   * Begin Custom Details panel loading
   */

  var panelOpen = false;

  // Create a custom control for the panel
  var panelControl = L.Control.extend({
    onAdd: function (map) {
      var panelDiv = L.DomUtil.create("div", "panel");
      panelDiv.style.position = "relative";
      panelDiv.style.top = "0";
      panelDiv.style.left = "-300px";
      panelDiv.style.width = "300px";
      panelDiv.style.height = "100%";
      panelDiv.style.backgroundColor = "#f1f1f1";
      panelDiv.style.transition = "all 0.3s ease";
      panelDiv.style.margin = "0";
      panelDiv.setAttribute("tabindex", "0"); // Add tabindex attribute

      // Add header to the panel
      var headerDiv = document.createElement("div");
      headerDiv.style.height = "20px";
      headerDiv.style.backgroundColor = "#db4437";
      headerDiv.style.color = "white";
      headerDiv.style.display = "flex";
      headerDiv.style.justifyContent = "space-between";
      headerDiv.style.alignItems = "center";
      headerDiv.style.padding = "10px";
      headerDiv.innerHTML =
        '<div class="panel-header-text"></div><button onclick="closePanel()" style="outline: none; background-color: #db4437; border: none; padding: 5px; cursor: pointer;" tabindex="0" title="Close panel" onfocus="this.style.outline=\'2px solid blue\'" onblur="this.style.outline=\'none\'" onmouseover="this.style.background=\'#f44336\'" onmouseout="this.style.background=\'#db4437\'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="fill: white;"><path d="M18.3 5.7c-.4-.4-1-.4-1.4 0L12 10.6 7.1 5.7c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4L10.6 12l-4.9 4.9c-.4.4-.4 1 0 1.4.2.2.5.3.7.3s.5-.1.7-.3L12 13.4l4.9 4.9c.2.2.5.3.7.3s.5-.1.7-.3c.4-.4.4-1 0-1.4L13.4 12l4.9-4.9c.4-.3.4-1 0-1.4z"/></svg></button>';
      panelDiv.appendChild(headerDiv);

      // Add content to the panel
      var contentDiv = document.createElement("div");
      contentDiv.style.padding = "10px";
      contentDiv.style.overflowY = "scroll";
      contentDiv.classList.add("panel-content");
      contentDiv.innerHTML = "This is the panel content.";
      panelDiv.appendChild(contentDiv);

      // Add keydown event listener
      panelDiv.addEventListener("keydown", function (event) {
        if (panelOpen) {
          var focusableElements = panelDiv.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          var lastElement = focusableElements[focusableElements.length - 1];
          var firstElement = focusableElements[0];

          if (event.key === "Escape") {
            closePanel();
          } else if (
            panelOpen &&
            event.key === "Tab" &&
            !event.shiftKey &&
            document.activeElement === lastElement
          ) {
            event.preventDefault();
            lastElement.blur(); // Remove focus from the last element
            firstElement.focus(); // Set focus to the first element
          } else if (
            panelOpen &&
            event.key === "Tab" &&
            event.shiftKey &&
            document.activeElement === firstElement
          ) {
            event.preventDefault();
            firstElement.blur(); // Remove focus from the first element
            lastElement.focus(); // Set focus to the last element
          }
        }
      });

      return panelDiv;
    },
    togglePanel: function () {
      var panelDiv = mapElement.querySelector(".panel");
      if (panelDiv.style.left === "-300px") {
        openPanel();
      } else {
        closePanel();
      }
    },
  });

  // Add the control to the map
  var panel = null;

  openPanel = function () {
    var panelDiv = mapElement.querySelector(".panel");
    if (panelDiv) {
      panelDiv.style.left = "0";
      panelDiv.focus();
    } else {
      // Add panel control to the map if it doesn't exist
      panel = new panelControl().addTo(map);
      panel.setPosition("topleft");
      var panelDiv = mapElement.querySelector(".panel");
      panelDiv.style.left = "0";
      panelDiv.focus();
    }
    panelOpen = true;
  };

  closePanel = function () {
    var panelDiv = mapElement.querySelector(".panel");
    if (panelDiv) {
      panelDiv.style.left = "-300px";
      panelDiv.blur();
      // Remove panel control from the map when it's closed
      panel.remove();
    }
    // map.getContainer().focus(); // Set focus back to the map
    if (prevClickedMarker) {
      prevClickedMarker.focus(); // Set focus back to the previous clicked marker
    } else {
      map.getContainer().focus(); // Set focus back to the map if there is no previous clicked feature
    }

    setTimeout(function () {
      panelOpen = false;
    }, 100);
  };

  function updateHeaderText(text) {
    var headerDiv = mapElement.querySelector(".panel-header-text");
    if (headerDiv) {
      headerDiv.textContent = text;
      headerDiv.setAttribute("aria-label", "Title");
      headerDiv.setAttribute("title", text);
    }
  }

  // Update the panel content
  function updatePanelContent(content) {
    var panelContent = mapElement.querySelector(".panel-content");

    var headerText = "";

    if (typeof content === "string") {
      panelContent.innerHTML = content;

      headerText = content;
    } else if (typeof content === "object") {
      var list = document.createElement("ul");
      list.style.listStyle = "none";
      list.style.margin = "0";
      list.style.padding = "0";

      if (Object.keys(content).length) headerText = Object.values(content)[0];

      for (var key in content) {
        if (content.hasOwnProperty(key)) {
          var value = content[key];
          var listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.justifyContent = "space-between";
          listItem.style.backgroundColor =
            list.children.length % 2 === 0 ? "#f1f1f1" : "#ddd";
          listItem.style.padding = "5px";
          listItem.tabIndex = 0;
          var keySpan = document.createElement("span");
          keySpan.style.width = "50%";
          keySpan.style.fontWeight = "bold";
          keySpan.innerHTML = key;
          keySpan.setAttribute("aria-label", "Key");
          keySpan.setAttribute("title", key);

          var valueSpan = document.createElement("span");
          valueSpan.style.width = "50%";
          valueSpan.style.textAlign = "right";
          valueSpan.innerHTML = value;
          valueSpan.setAttribute("aria-label", "Value");
          valueSpan.setAttribute("title", value);

          listItem.appendChild(keySpan);
          listItem.appendChild(valueSpan);
          list.appendChild(listItem);
        }
      }

      panelContent.replaceChildren(list);
    }

    updateHeaderText(headerText);
  }

  /**
   * End custom details panel loading
   */

  /**
   * start basemap loading
   */

  // create new pane to host basemap layers
  var basemapsPaneName = "basemapsPane";
  map.createPane(basemapsPaneName).style.zIndex = "10";

  var basemapLayerOptions = {
    tms: false,
    tileSize: 256,
    attribution: attributionVal[mapConfig.language],
    noWrap: false,
    attributionControl: false,
  };

  /**
   * basemap list
   */
  var basemapsList = {
    3978: {
      transport: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBMT_CBCT_GEOM_3978/MapServer/WMTS/tile/1.0.0/CBMT_CBCT_GEOM_3978/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBMT_CBCT_GEOM_3978/MapServer?f=pjson",
      },
      simple: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/Simple/MapServer/WMTS/tile/1.0.0/Simple/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/Simple/MapServer?f=pjson",
      },
      shaded: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBME_CBCE_HS_RO_3978/MapServer/WMTS/tile/1.0.0/CBMT_CBCT_GEOM_3978/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBME_CBCE_HS_RO_3978/MapServer?f=pjson",
      },
      label: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/xxxx_TXT_3978/MapServer/WMTS/tile/1.0.0/xxxx_TXT_3978/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/xxxx_TXT_3978/MapServer?f=pjson",
      },
      osm: {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      },
    },
    3857: {
      transport: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBMT_CBCT_GEOM_3857/MapServer/WMTS/tile/1.0.0/BaseMaps_CBMT_CBCT_GEOM_3857/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBMT_CBCT_GEOM_3857/MapServer?f=pjson",
      },
      simple: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/Simple/MapServer/WMTS/tile/1.0.0/Simple/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/Simple/MapServer?f=pjson",
      },
      shaded: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBME_CBCE_HS_RO_3978/MapServer/WMTS/tile/1.0.0/CBMT_CBCT_GEOM_3978/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/CBME_CBCE_HS_RO_3978/MapServer?f=pjson",
      },
      label: {
        url: "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/xxxx_TXT_3857/MapServer/WMTS/tile/1.0.0/xxxx_TXT_3857/default/default028mm/{z}/{y}/{x}.jpg",
        jsonUrl:
          "https://maps-cartes.services.geo.ca/server2_serveur2/rest/services/BaseMaps/xxxx_TXT_3857/MapServer?f=pjson",
      },
      osm: {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      },
    },
  };

  function addBasemap(url, options) {
    L.tileLayer(url, options).addTo(map);
  }

  function loadDefaultBasemaps() {
    const basemapLayers = [];

    let mainBasemapOpacity = 1;

    if (mapConfig.map.basemap.shaded !== false) {
      basemapLayers.push({
        id: "shaded",
        url: basemapsList[mapConfig.map.projection].shaded.url,
        options: basemapLayerOptions,
        opacity: mainBasemapOpacity,
        basemapPaneName: basemapsPaneName,
      });
      mainBasemapOpacity = 0.75;
    }

    basemapLayers.push({
      id: mapConfig.map.basemap.id || "transport",
      url:
        basemapsList[mapConfig.map.projection][mapConfig.map.basemap.id].url ||
        basemapsList[mapConfig.map.projection].transport.url,
      options: basemapLayerOptions,
      opacity: mainBasemapOpacity,
      basemapPaneName: basemapsPaneName,
    });

    if (mapConfig.map.basemap.labeled !== false) {
      // get proper label url
      basemapLayers.push({
        id: "label",
        url: basemapsList[mapConfig.map.projection].label.url.replaceAll(
          "xxxx",
          mapConfig.language === "en" ? "CBMT" : "CBCT"
        ),
        options: basemapLayerOptions,
        opacity: 1,
        basemapPaneName: basemapsPaneName,
      });
    }

    for (var i = 0; i < basemapLayers.length; i++) {
      addBasemap(basemapLayers[i].url, basemapLayers[i].options);
    }
  }

  loadDefaultBasemaps();
  /** end of basemap loading */

  /**
   * start layers loading
   */
  var prevClickedMarker = null;

  function clearPrevClickMarker() {
    if (prevClickedMarker) {
      prevClickedMarker.style.backgroundColor = "transparent";
      prevClickedMarker.style.zIndex = "initial";
      prevClickedMarker.style.border = "initial";
      prevClickedMarker.style.borderRadius = "initial";
    }
  }

  function loadGeoJson(config) {
    if (!config.url) return;

    var customMarker = L.icon({
      iconUrl: config.customMarkerIcon.point,
      iconSize: [30, 30], // size of the icon
      iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
    });

    var geojsonMarkerOptions = {
      radius: 8,
      fillColor: "#ff7800",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    };

    var myStyle = {
      color: "#FFF",
      weight: 5,
      opacity: 0.65,
    };

    function clickFunction(e) {
      if (prevClickedMarker) {
        prevClickedMarker.style.backgroundColor = "transparent";
        prevClickedMarker.style.zIndex = "initial";
        prevClickedMarker.style.border = "initial";
        prevClickedMarker.style.borderRadius = "initial";
      }

      e.target._icon.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
      e.target._icon.style.borderRadius = "50%";
      e.target._icon.style.border = "6px solid rgba(255, 255, 255, 0.4)";
      e.target._icon.style.zIndex = 1000;

      prevClickedMarker = e.target._icon;

      openPanel();

      const properties =
        e.target.feature && e.target.feature.properties
          ? e.target.feature.properties
          : "No properties";

      updatePanelContent(properties);
    }

    fetch(config.url)
      .then((response) => response.json())
      .then((data) => {
        let geoJsonLayer = L.Proj.geoJson(data, {
          pointToLayer: function (feature, latlng) {
            let firstProperty =
              (feature.properties && Object.values(feature.properties)[0]) ||
              "Item";

            return (
              L.marker(latlng, {
                icon: customMarker,
              })
                // .bindPopup(firstProperty)
                .bindTooltip(firstProperty)
                .on("click", clickFunction)
                .on("keypress", function (e) {
                  if (e.originalEvent.key === "Enter") {
                    clickFunction(e);
                  }
                })
            );
          },
          style: myStyle,
        }).addTo(map);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  loadGeoJson(mapConfig.layers[0].config);
}
