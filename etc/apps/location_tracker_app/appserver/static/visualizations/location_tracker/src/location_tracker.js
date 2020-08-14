define([
            'jquery',
            'underscore',
            '../customleaflet/leaflet',
            'api/SplunkVisualizationBase',
            'api/SplunkVisualizationUtils',
            '../contrib/leaflet.vectormarkers'
        ],
        function(
            $,
            _,
            LeafletExport,
            SplunkVisualizationBase,
            vizUtils
        ) {

            var L = LeafletExport.default;

    var TILE_PRESETS = {
        'satellite_tiles': {
            minZoom: 1,
            maxZoom: 19,
            url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        },
        'openstreetmap_tiles': {
            minZoom: 1,
            maxZoom: 19,
            url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

        },
        'light_tiles': {
            minZoom: 1,
            maxZoom: 19,
            url: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
        },
        'dark_tiles': {
            minZoom: 1,
            maxZoom: 19,
            url: 'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
        }

    };

    return SplunkVisualizationBase.extend({

        maxResults: 50000,
        COLORS: vizUtils.getColorPalette('splunkCategorical'),
        icons: [],
        tileLayer: null,
        activeTrails: [],
        activeTileset: '',

        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            $(this.el).addClass('splunk-location-tracker');
            this.isInitializedDom = false;
        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                count: this.maxResults
            });
        },

		reflow: function() {
            if (this.map) {
                this.map.invalidateSize();
            }
        },

        updateView: function(data, config) {
            var dataRows = data.rows;
            if (!dataRows || dataRows.length === 0 || dataRows[0].length === 0) {
                return this;
            }

            // get configs
            var interval    = (+this._getEscapedProperty('interval', config) || 10) * 1000, // interval that splits apart the different traces
                showTraces  = vizUtils.normalizeBoolean(this._getEscapedProperty('showTraces', config)),
                staticIcon  = this._getEscapedProperty('staticIcon', config) || 'none';
                tileset     = this._getEscapedProperty('tileSet', config) || 'light_tiles',
                tileConfig  = TILE_PRESETS[tileset],
                updateTiles = tileset !== this.activeTileset;

            var url         = tileConfig.url,
                maxZoom     = tileConfig.maxZoom,
                minZoom     = tileConfig.minZoom,
                attribution = tileConfig.attribution;

            var intervalCounter = 0;
            var previousTime = new Date();
            var that = this;

            var data = _.chain(dataRows)
            	.map(function(d) {
                    var lat = +d[1];
                    var lon = +d[2];
                    var dt = new Date(d[0]);
                    var id = d[3];

                    var colorIndex = that.activeTrails.indexOf(id);

                    if (colorIndex < 0) {
                        colorIndex = that.activeTrails.push(id) - 1;
                    }
                    

	            	return {
                        'id': id,
                        'colorIndex': colorIndex,
                        'coordinates': L.latLng(lat, lon),
                        'time': dt,
                        'icon': d[4] ? d[4] : false
	            	}
      			})
      			.sortBy(function(d) {
      				return -d.time;
      			})
                .each(function(d) {
                    var dt = d.time;
                    if (interval && previousTime - dt > interval) {
                        intervalCounter++;
                    }
                    d.interval = 'interval' + intervalCounter;

                    previousTime = dt;
                })
                .groupBy(function(d) {
                    return d.id;
                })
                .values()
      			.value();

      		var latestCoords = data[0][0].coordinates;


            if (!this.isInitializedDom) {
                var map = this.map = L.map(this.el, {
                    scrollWheelZoom: false
                }).setView(latestCoords, Math.min(maxZoom, 14));
				this.tileLayer = L.tileLayer(url, {
				    attribution: attribution
				}).addTo(map);

				this.isInitializedDom = true;

	            this.layerGroup = new L.LayerGroup().addTo(map);
            } else {
                if (updateTiles) {
                    this.map.removeLayer(this.tileLayer);
                    this.tileLayer = L.tileLayer(url, {
                        attribution: attribution
                    }).addTo(this.map);


                    if (minZoom <= maxZoom) {
                        this.map.options.maxZoom = maxZoom;
                        this.map.options.minZoom = minZoom;

                        if (this.map.getZoom() > maxZoom) {
                            this.map.setZoom(maxZoom);
                        }
                        else if (this.map.getZoom() < minZoom) {
                            this.map.setZoom(minZoom);
                        } else {
                            this.map.fire('zoomend');
                        }
                    }
                    this.activeTileset = tileset;
                }
            }

      		if (data.length == 0) {
      			return;
      		}

            var layerGroup = this.layerGroup;
            this.layerGroup.clearLayers();

            this.useDrilldown = this._isEnabledDrilldown(config);

            _.each(data, function(userData, i) {
                var data = _.chain(userData)
                    .groupBy(function(d) {
                        return d.interval;
                    })
                    .values()
                    .value();

                var iconCfg = {
                    markerColor: this.COLORS[data[0][0].colorIndex % this.COLORS.length]
                };

                iconCfg['icon'] = staticIcon !== 'none' ? staticIcon : false;

                if (data[0][0].icon) {
                    iconCfg['icon'] = data[0][0].icon;
                }

                var icon = L.VectorMarkers.icon(iconCfg);

                var marker = L.marker(data[0][0].coordinates, {
                    icon: icon
                });
                marker.addTo(layerGroup);

                marker.bindPopup(data[0][0].id, {
                    offset:  L.point(1, -43),
                    closeButton: false
                });

                marker.on('click', function(e) {
                    that._drilldown(data[0][0].id);
                });

                marker.on('mouseover', function(e) {
                    this.openPopup();
                });
                marker.on('mouseout', function(e) {
                    this.closePopup();
                });

                if (showTraces) {
                    _.each(data, function(trace) {
                        L.polyline(_.pluck(trace, 'coordinates'), {color: this.COLORS[data[0][0].colorIndex % this.COLORS.length]}).addTo(layerGroup);
                    }, this);
                }

            }, this);

            if (this.useDrilldown) {
                $(this.el).addClass('location-tracker-drilldown');
            } else {
                $(this.el).removeClass('location-tracker-drilldown');
            }

            return this;
        },

        _drilldown: function(resource) {
            var fields = this.getCurrentData().fields;
            var drilldownDescription = {
                action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
                data: {}
            };
            drilldownDescription.data[fields[3].name] = resource;
            this.drilldown(drilldownDescription);
        },

        _getEscapedProperty: function(name, config) {
            var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
            return vizUtils.escapeHtml(propertyValue);
        },

        _isEnabledDrilldown: function(config) {
            if (config['display.visualizations.custom.drilldown'] && config['display.visualizations.custom.drilldown'] === 'all') {
                return true;
            }
            return false;
        }
    });
});