//
// Written by - Mark Sivill
//
// Description - take a SPL field which contains SVG, validate it is valid XML, then pass to SVG javascript library to render
//
// Notes - snapsvg does not conform to npm naming conventions so does not load correctly in define section so using svgjs instead
//
// Notes - when pulling large external svg values replace " with \" as some external files contain ' which can cause issues

define([
    'jquery',
    'underscore',
    'api/SplunkVisualizationBase',
    'api/SplunkVisualizationUtils',
    'fast-xml-parser',
    'svg.js'
],
    function (
        $,
        _,
        SplunkVisualizationBase,
        vizUtils,
        fastXmlParser,
        SVGJS
    ) {

        // Extend from SplunkVisualizationBase
        return SplunkVisualizationBase.extend({

            initialize: function () {
                SplunkVisualizationBase.prototype.initialize.apply(this, arguments);

                // used magic number as multiple svg components may be on page
                // so can generate different ids for html elements
                this.magicNumber = "_" + (new Date()).getTime() + "_" + Math.floor((Math.random() * 1000000) + 1);
                this.svg_div_name = "svg_splunk_container" + this.magicNumber;
                this.svg_field_name = "svg_viz";
                this.svg_splunk_use_viewbox = true;
                this.svg_splunk_viewbox_min_x_pixels = 0;
                this.svg_splunk_viewbox_min_y_pixels = 0;
                this.svg_splunk_viewbox_width_pixels = 100;
                this.svg_splunk_viewbox_height_pixels = 100;
                this.is_debug_on = false;
                this.svg_error_message_delay_in_seconds = 0;

                this.$el = $(this.el);

                // TODO remove stylesheet test
                // font-family: 'Overpass', sans-serif;
                // "<style>@import url('https://fonts.googleapis.com/css?family=Overpass:100,200,300,400,600,700,800,900');</style>"
                // "<style>@import url('https://fonts.googleapis.com/css?family=Great+Vibes&subset=latin-ext');</style>"
                this.$el.append(
                    "<div id=\"svg_splunk_wrapper" + this.magicNumber + "\" style=\"width: 100%; height: 100%; margin: 0 auto;\">"
                    + "<div id=\"" + this.svg_div_name + "\"></div>"
                    + "</div>"
                );

            },

            _debug: function (message) {

                if (this.is_debug_on === true) {
                    timestamp = new Date();
                    timestamp_string = timestamp.getFullYear() + '-' + (timestamp.getMonth() + 1) + '-' + timestamp.getDate() + " " + timestamp.getHours() + ":" + timestamp.getMinutes() + ":" + timestamp.getSeconds() + "." + timestamp.getMilliseconds();
                    console.log(timestamp_string + " id=" + this.magicNumber + " " + message);
                }

            },

            // get config here
            _getConfigParams: function (config) {

                // default to false if not set
                try {
                    this.is_debug_on = (config["display.visualizations.custom.svg.svg.debug"] == 'true') || false;
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.debug");
                    this.is_debug_on = false;
                }

                // default set to true if not set
                try {
                    if (config["display.visualizations.custom.svg.svg.use_viewbox"] == undefined || config["display.visualizations.custom.svg.svg.use_viewbox"] == null) {
                        this.svg_splunk_use_viewbox = true;
                    } else {
                        this.svg_splunk_use_viewbox = (config["display.visualizations.custom.svg.svg.use_viewbox"] == 'true') || false;
                    }
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.use_viewbox");
                    this.svg_splunk_use_viewbox = true;
                }

                try {
                    this.svg_splunk_viewbox_min_x_pixels = Number(config["display.visualizations.custom.svg.svg.viewbox_min_x"]) || 0;
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.viewbox_min_x");
                    this.svg_splunk_viewbox_min_x_pixels = 0;
                }

                try {
                    this.svg_splunk_viewbox_min_y_pixels = Number(config["display.visualizations.custom.svg.svg.viewbox_min_y"]) || 0;
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.viewbox_min_y");
                    this.svg_splunk_viewbox_min_y_pixels = 0;
                }

                try {
                    this.svg_splunk_viewbox_width_pixels = Number(config["display.visualizations.custom.svg.svg.viewbox_width"]) || 100;
                    if (this.svg_splunk_viewbox_width_pixels <= 0) {
                        throw new Error("Number must be above zero");
                    }
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.viewbox_width");
                    this.svg_splunk_viewbox_width_pixels = 100;
                }

                try {
                    this.svg_splunk_viewbox_height_pixels = Number(config["display.visualizations.custom.svg.svg.viewbox_height"]) || 100;
                    if (this.svg_splunk_viewbox_height_pixels <= 0) {
                        throw new Error("Number must be above zero");
                    }
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.viewbox_height");
                    this.svg_splunk_viewbox_height_pixels = 100;
                }

                try {
                    this.svg_error_message_delay_in_seconds = Number(config["display.visualizations.custom.svg.svg.error_message_delay_in_seconds"]) || 0;
                    if (this.svg_error_message_text < 0) {
                        throw new Error("Number must be zero or above");
                    }
                } catch (err) {
                    this._debug("validation_error=display.visualizations.custom.svg.svg.error_message_delay_in_seconds");
                    this.svg_error_message_delay_in_seconds = 0;
                }

                this._debug("is_debug_on=" + this.is_debug_on
                    + " use_viewbox=" + this.svg_splunk_use_viewbox
                    + " viewbox_min_x=" + this.svg_splunk_viewbox_min_x_pixels
                    + " viewbox_min_y=" + this.svg_splunk_viewbox_min_y_pixels
                    + " viewbox_width=" + this.svg_splunk_viewbox_width_pixels
                    + " viewbox_height=" + this.svg_splunk_viewbox_height_pixels
                    + " error_message_delay=" + this.svg_error_message_delay_in_seconds);

            },

            // get data from the first column on the first row only (additional rows and colums ignored)
            // this is where the svg text should be located
            // return false (if no rows found, no this.svg_viz_field in query, or no value in field)
            formatData: function (data, config) {

                this._getConfigParams(config);

                // Check for an empty data object
                if (data.rows.length < 1) {
                    return false;
                }

                var dataItem = undefined;

                // work out what field number svg is in
                var svg_field_number = undefined;
                for (var i = 0; i < data.fields.length; i++) {
                    // look for the entry with a matching `svg` value
                    if (data.fields[i].name == this.svg_field_name) {
                        svg_field_number = i;
                        this._debug("svg_field_number=" + svg_field_number);
                    }
                }

                if (svg_field_number !== undefined) {

                    // check value is present on first row and column
                    try {
                        // check against first row when mutilple rows present
                        dataItem = data.rows[0][svg_field_number];
                        this._debug("multiple_rows=true");
                    }
                    catch (err) {
                        try {
                            // check against one row
                            dataItem = data.rows[svg_field_number];
                            if (dataItem === undefined || dataItem == null || dataItem.length <= 0) {
                                return false;
                            }
                        }
                        catch (err) {
                            dataItem = undefined;
                        }
                        this._debug("multiple_rows=false");
                    }

                    // check value is valid SVG
                    if (dataItem !== undefined) {
                        try {

                            var options = {
                                attrPrefix: "@_",
                                attrNodeName: false,
                                textNodeName: "#text",
                                ignoreNonTextNodeAttr: true,
                                ignoreTextNodeAttr: true,
                                ignoreNameSpace: true,
                                ignoreRootElement: false,
                                textNodeConversion: true,
                                textAttrConversion: false,
                                arrayMode: false
                            };

                            is_valid_xml = false;

                            if (fastXmlParser.validate(dataItem, options) === true) {
                                is_valid_xml = true;
                            }
                            else {
                                is_valid_xml = false;
                            }

                            this._debug("is_svg_valid_xml=" + is_valid_xml);

                            if (is_valid_xml === false) {
                                throw new Error("Not valid XML so cannot be valid SVG");
                            }

                        }
                        catch (err) {
                            this._debug("is_svg_valid_xml=false svg_parse_error_message=" + err.message);
                            dataItem = undefined;
                        }
                    }


                }
                else {
                    // no this.svg_field_name defined
                    this._debug("svg_field_number=not_found");
                    return false;
                }

                this._debug("svg_from_field=" + dataItem);
                return dataItem;
            },

            // Implement updateView to render a visualization.
            //  'data' will be the data object returned from formatData or from the search
            //  'config' will be the configuration property object
            updateView: function (data, config) {

                this._getConfigParams(config);

                // what is current width of dashboard panel
                this.svg_splunk_calculated_width_pixels = this.$el.width();
                this.svg_splunk_calculated_height_pixels = this.$el.height();

                this._debug("div_width=" + this.svg_splunk_calculated_width_pixels
                    + " div_height=" + this.svg_splunk_calculated_height_pixels
                );


                // set a default svg if error in parsing SVG or with SVG field
                var svg = null;
                var svg_delay = this.svg_error_message_delay_in_seconds + 0.01;
                if (data === undefined) {
                    svg = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 100 100'><g><text text-anchor='middle' x='50' y='50'>SVG parse error</text></g></svg>"
                    // svg = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 100 100'><g><text text-anchor='middle' x='50' y='-50' font-size='14'>SVG parse error<animate attributeType='XML' attributeName='y' to='50' begin='" + svg_delay + "' dur='0.01' fill='freeze'/></text></g></svg>";
                } else if (data == false) {
                    svg = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 100 100'><g><text text-anchor='middle' x='50' y='50'>SVG field error</text></g></svg>"
                    // svg = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 100 100'><g><text text-anchor='middle' x='50' y='-50' font-size='14'>SVG field error<animate attributeType='XML' attributeName='y' to='50' begin='" + svg_delay + "' dur='0.01' fill='freeze'/></text></g></svg>";
                } else {
                    svg = data;
                }

                // set div height width
                $(this.svg_div_name).css("width", this.svg_splunk_calculated_width_pixels);
                $(this.svg_div_name).css("height", this.svg_splunk_calculated_height_pixels);

                // Draw something here
                document.getElementById(this.svg_div_name).innerHTML = "";

                var draw = SVGJS(this.svg_div_name)
                    .size(this.svg_splunk_calculated_width_pixels, this.svg_splunk_calculated_height_pixels)

                // add viewbox if asked for
                if (this.svg_splunk_use_viewbox === true) {
                    draw = draw.viewbox(this.svg_splunk_viewbox_min_x_pixels, this.svg_splunk_viewbox_min_y_pixels, this.svg_splunk_viewbox_width_pixels, this.svg_splunk_viewbox_height_pixels);
                }
                //else {
                //    draw = draw.viewbox(0, 0, this.svg_splunk_calculated_width_pixels, this.svg_splunk_calculated_width_pixels);
                //}

                this._debug("svg_to_display=" + svg);

                try {
                    draw.svg(svg);
                    this._debug("is_successful_draw=true");
                } catch (err) {
                    this._debug("is_successful_draw=false");
                }

                this._debug("svg_displayed_on_page=" + $("#" + this.svg_div_name).html());

            },

            // Search data params
            getInitialDataParams: function () {
                return ({
                    outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                    count: 10000
                });
            },

            // Override to respond to re-sizing events
            reflow: function () {

                // If size changed, redraw.
                if ((this.svg_splunk_calculated_width_pixels !== this.$el.width()) || (this.svg_splunk_calculated_height_pixels !== this.$el.height())) {
                    this.invalidateUpdateView();
                }

            }

        });
    });
