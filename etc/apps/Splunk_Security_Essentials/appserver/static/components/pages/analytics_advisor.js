/**
 * The below is a custom table renderer for the content table. It highlights colours inside the cells.
 */
require([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, mvc, TableView) {
    var CustomIconRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            return cell.field === 'Details' || cell.field === 'Description' || cell.field === 'Title' || cell.field === 'Detection Search' || cell.field === 'Data Availability' || cell.field === 'Enabled';
            //return cell.field === 'Details';
        },
        render: function($td, cell) {
            var cellvalue = cell.value;
            if (cell.field === 'Details') {
                var newYes = '<span class="green">Yes</span>'
                var newNo = '<span class="red">No</span>'
                var newZero = ' <span class="red">0</span>'
                var newText = ""
                $.each(cellvalue, function(i, val) {
                    newText = val;
                    newText = newText.replace(RegExp("Yes", "gi"), newYes);
                    newText = newText.replace(RegExp("No", "gi"), newNo);
                    newText = newText.replace(RegExp(" 0", "gi"), newZero);
                    cellvalue[i] = newText + '<br />';

                });

            }
            if (cell.field === 'Details' || cell.field === 'Description' || cell.field === 'Title' || cell.field === 'Detection Search') {
                //This section effectively parses the html tags so they are not shown in the table. It also adds highlights to any search filter.
                var searchfilter = $(".splunk-textinput input[type='text']").val();
                if (typeof searchfilter.length != "undefined" && searchfilter.length > 0) {
                    var re = new RegExp("(" + searchfilter + ")","gi");
                    cellvalue = cellvalue.replace(re, "<span class=\"highlight\">$1</span>");
                    //cellvalue = cellvalue.replace(RegExp(searchfilter, "gi"), '<span class="highlight">' + searchfilter + '</span>');
                }
            }
            if (cell.field === 'Enabled'){
                cellvalue = cellvalue.replace(RegExp("Yes", "gi"), '<span class="green">Yes</span>');
            }
            if (cell.field === 'Data Availability') {
                cellvalue = cellvalue.replace(RegExp("Good", "gi"), '<span class="green">Good</span>');
                cellvalue = cellvalue.replace(RegExp("Bad", "gi"), '<span class="red">Bad</span>');
            }
            $td.html(cellvalue);
        }
    });
    mvc.Components.get('content_table').getVisualization(function(tableView) {
        // Register custom cell renderer, the table will re-render automatically
        tableView.addCellRenderer(new CustomIconRenderer());
    });
    mvc.Components.get('datacategory_table').getVisualization(function(tableView) {
        // Register custom cell renderer, the table will re-render automatically
        tableView.addCellRenderer(new CustomIconRenderer());
    });


    /**
 * The below is a custom table renderer for the MITRE Map table.
 */
    var MitreMapTableRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            return true;
        },
        render: function($td, cell) {
            var cellvalue = cell.value;

            if (cellvalue != null) {
                values = [];
                $.each(cellvalue, function(i, val) {
                    values[i] = val;

                });
                var celltext = values[0].split(" (")[0];
                var threat_groups=values[0].split(" (")[1];
                var colorhex = values[1];
                var bgcoloropacity = values[2];
                var tooltip = values[3];

                if (typeof(threat_groups) != "undefined") {
                    threat_groups = threat_groups.replace(")", "")
                    tooltip=tooltip+"<br />Threat Groups: "+threat_groups
                    $td.addClass("threat_group");
                }
                if (tooltip.search(/Selected: 0/i)==-1) {
                    $td.addClass("selected");
                }
                $td.attr( "style", "background-color: rgb(" + hexToRgb(colorhex) + "," + bgcoloropacity + ") !important;");


                $td.html(_.template('<span data-toggle="tooltip" data-placement="bottom" title="<%- tooltip%>"><%- celltext%></span>', {
                    tooltip: tooltip,
                    celltext: celltext

                }));

                $td.children().tooltip({ html: 'true' })
                    //console.log(mitre_technique+" "+mitre_technique_count_total)


            } else {
                $td.html(cell.value);
            }
        }
    });
    if (mvc.Components.get('mitremaptable')) {

        mvc.Components.get('mitremaptable').getVisualization(function(tableView) {
            // Register custom cell renderer, the table will re-render automatically
            tableView.addCellRenderer(new MitreMapTableRenderer());
        });
    }
});

/**
 * The below defines tooltips.
 */
require(["jquery",
        "splunkjs/ready!",
        "bootstrap.popover",
        "bootstrap.tooltip"
    ],
    function(
        $, Ready) {
        $("label:contains('Split by')").prop('title', 'This option selects which field to split the X-axis by.');
        $("label:contains('Phase')").prop('title', '<p>Current: Content is installed, the data is in Splunk and it is enabled.</p><p>Phase 1: Content is installed, the data is in Splunk and but it is disabled.</p><p>Phase 2: Content is installed, the data is not in Splunk and it is disabled.</p><p>Selected Sourcetypes: This highlight where the selected sourcetypes would map to what is on the X-axis. .</p>');
        $("label:contains('Status')").prop('title', '<p>Active: Content is enabled and the data required is available in Splunk.</p><p>Available: Content is disabled and the data required is available in Splunk.</p><p>Needs data: We need more data to enable the content</p><p>Selected: This highlights where the selected data sources would map to what is on the X-axis. .</p>');
        $("label:contains('Sourcetype origin')").prop('title', '<p>Installed Sourcetypes: The chart is filtered to Sourcetypes that are currently installed.</p><p>All Sourcetypes: The chart is filtered to sourcetypes that are either installed or are referred to in the content search string.</p><p>Sample Sourcetypes: The chart is filtered to sourcetypes that are provided with the app. This list represents a large proportion of the sourcetypes available on Splunkbase. This setting will allow you to run analytics without having any Add-ons or data in Splunk.</p>');
        $("label:contains('Sourcetype selection')").prop('title', 'Select which Sourcetypes to highlighted in the "Selected" field');
        $("label:contains('Data')").prop('title', 'Filters the list to show if we have data for the content.');
        $("label:contains('Enabled')").prop('title', 'Filters the list to show if we have enabled the content.');
        $("label:contains('Datamodel')").prop('title', 'Filters the list to show only the selected Datamodel.');
        $("label:contains('Originating app')").prop('title', 'Filters the list to show only content from a specific app.');
        $("label:contains('Content type')").prop('title', 'Filters the list to show only content that is based on either Indexed data or a Datamodel.');
        $("label:contains('Use Case')").prop('title', 'Filters the list to show only the selected Use Cases. The Use Cases are high level categories that are useful to gauge the level of maturity for the content.');
        $("label:contains('Sourcetype filter')").prop('title', 'Filters to show only content that is mapped to the selected Sourcetypes.');
        $("label:contains('Add-On')").prop('title', 'Filters the list to show only content that is mapped to the selected Add-On.');
        $("label:contains('Sourcetype and Add-On')").prop('title', 'Toggle to show the list of Sourcetypes and Add-Ons associated with the content.');
        $("label:contains('Featured')").prop('title', 'Featured searches are those that come recommended by Splunk\'s Security SMEs.');
        $("label:contains('Bookmarked')").prop('title', 'Toggle to show only content that is bookmarked');
        $("label:contains('Bookmark Status')").prop('title', 'Filters the list to show only content that has the selected Bookmark Status');
        $("label:contains('Bookmarked and Featured')").prop('title', 'Toggle to show only content that is only bookmarked or featured');
        $("label:contains('Data Source')").prop('title', 'The data sources that power the content. These are mapped to individual technologies.');
        $("label:contains('Highlight Data Source')").prop('title', 'Highlight which content uses the selected Data Sources. Data Sources are mapped to individual technologies.');
        $("label:contains('Data Source Category')").prop('title', 'The data category that powers the content. A data category is granular and details which types of events are required to enable the content.');
        $("label:contains('Journey')").prop('title', 'This represents where the content sits in the Splunk Security Journey.');
        $("label:contains('Search Query')").prop('title', 'Toggle to show the actual SPL search for the content.');
        $("label:contains('Color by')").prop('title', '<p>Select how to color the cells in the matrix.<br /><ul><li>Total means all content regardless of status.</li><li>Active means content which is currently enabled in your environment.</li><li>Available means content which is available to start using with your data.</li><li>Needs Data means content you could use if you ingested more data into Splunk.</li></ul></p>');
        $("label:contains('Search Filter')").prop('title', 'The filter does a case insensitive text match. There are implied wildcards before and after the input string. You can also specify underscore ( _ ) characters for a single character match.');
        $("label:contains('MITRE Tactic')").prop('title', 'MITRE Tactics represent the "why" of an ATT&CK technique. It is the adversary’s tactical objective: the reason for performing an action. See the MITRE reference link at the top of the page for more details.');
        $("label:contains('MITRE Technique')").prop('title', 'MITRE Techniques represents “how” an adversary achieves a tactical objective by performing an action. See the MITRE reference link at the top of the page for more details.');
        $("label:contains('MITRE Threat Group')").prop('title', 'MITRE ATT&CK and PRE-ATT&CK map out the threat groups that are known to use particular techniques. This is of particular value for organizations who have a solid understanding of who their attackers are, and can build defenses specifically tied to those attacking groups.');
        $("label:contains('MITRE ATT&CK Tactic')").prop('title', 'MITRE Tactics represent the "why" of an ATT&CK technique. It is the adversary’s tactical objective: the reason for performing an action. See the MITRE reference link at the top of the page for more details.');
        $("label:contains('MITRE ATT&CK Technique')").prop('title', 'MITRE Techniques represents “how” an adversary achieves a tactical objective by performing an action. See the MITRE reference link at the top of the page for more details.');
        $("label:contains('MITRE ATT&CK Threat Group')").prop('title', 'MITRE ATT&CK and PRE-ATT&CK map out the threat groups that are known to use particular techniques. This is of particular value for organizations who have a solid understanding of who their attackers are, and can build defenses specifically tied to those attacking groups.');
        $("label:contains('Show Only Available Content')").prop('title', 'This checkbox filters out the MITRE Techniques that do not have an associated detection in this Splunk environment, i.e. it removes all cells with zeros.');
        $("label:contains('Show Only Popular Techniques')").prop('title', 'MITRE ATT&CK and PRE-ATT&CK map out the threat groups that are known to use particular techniques. This checkbox filters out the MITRE Techniques that are not very popular, i.e. less than 5 Threat Groups are known to be using them.');
        $("label:contains('Kill Chain Phase')").prop('title', 'Each step in the Cyber Kill Chain defines the steps used by cyber attackers.  The theory is that by understanding each of these stages, defenders can better identify and stop attacks at each of the stages. See the Cyber Kill Chain reference link at the top of the page for more details.');
        $("label:contains('NIST')").prop('title', 'The NIST Cybersecurity Framework presents a listing of Functions, Categories, Subcategories and Informative References (standards, guidelines, and practices) that describe specific cybersecurity activities. The mapping in this app represents the Function and Category elements of the framework. See the NIST Cybersecurity Framework reference link at the top of the page for more details.');
        $("label:contains('CIS')").prop('title', 'The CIS Controls are a prioritized set of controls and actions to defend against pervasive cyber threats. See the CIS Controls reference link at the top of the page for more details.');
        $("label[title]").tooltip({ html: 'true' })
        $("#row1_col5 .panel-title:contains('Stage 1')").prop('title', '<h3>Collection</h3><p>Collect basic security logs and other machine data from your environment.</p>');
        $("#row1_col5 .panel-title:contains('Stage 2')").prop('title', '<h3>Normalization</h3><p>Apply a standard security taxonomy and add asset and identity data.</p>');
        $("#row1_col5 .panel-title:contains('Stage 3')").prop('title', '<h3>Expansion</h3><p>Collect additional high fidelity data sources like endpoint activity and network metadata to drive advanced attack detection.</p>');
        $("#row1_col5 .panel-title:contains('Stage 4')").prop('title', '<h3>Enrichment</h3><p>Augment security data with intelligence sources to better understand the context and impact of an event.</p>');
        $("#row1_col5 .panel-title:contains('Stage 5')").prop('title', '<h3>Automation and Orchestration</h3><p>Establish a consistent and repeatable security operation capability.</p>');
        $("#row1_col5 .panel-title:contains('Stage 6')").prop('title', '<h3>Advanced Detection</h3><p>Apply sophisticated detection mechanisms including machine learning.</p>');
        $("#row1_col6 .panel-title:contains('Stage 1')").prop('title', '<h3>Collection</h3><p>Collect basic security logs and other machine data from your environment.</p>');
        $("#row1_col6 .panel-title:contains('Stage 2')").prop('title', '<h3>Normalization</h3><p>Apply a standard security taxonomy and add asset and identity data.</p>');
        $("#row1_col6 .panel-title:contains('Stage 3')").prop('title', '<h3>Expansion</h3><p>Collect additional high fidelity data sources like endpoint activity and network metadata to drive advanced attack detection.</p>');
        $("#row1_col6 .panel-title:contains('Stage 4')").prop('title', '<h3>Enrichment</h3><p>Augment security data with intelligence sources to better understand the context and impact of an event.</p>');
        $("#row1_col6 .panel-title:contains('Stage 5')").prop('title', '<h3>Automation and Orchestration</h3><p>Establish a consistent and repeatable security operation capability.</p>');
        $("#row1_col6 .panel-title:contains('Stage 6')").prop('title', '<h3>Advanced Detection</h3><p>Apply sophisticated detection mechanisms including machine learning.</p>');

        //Special stylin on the MITRE Matrix tab
        $("label:contains('Show Only Available Content')").parent().css( "width","220px");
        $("label:contains('Show Only Popular Techniques')").parent().css( "width","220px");

        $("[data-toggle=tab]").click(function(evt) {
                let obj = evt.target;

                let name = "generic";
                try {
                    name = $(obj).closest(".panel-body").find("h1").text().replace(/^\d\. /, "");
                } catch {
                    // nothing
                }
                let status = true;
                let value = $(obj).text();
                let page = splunkjs.mvc.Components.getInstance("env").toJSON()['page'];
                require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
                    let record = { "name": name, "value": value, "status": status, "page": page }
                    for(let i = 0; i < appConfig.length; i++){
                        if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                             record.demoMode = true
                        }
                    }
                    Telemetry.SendTelemetryToSplunk("FiltersChanged", record)
                })


            })
            //$(".panel-title[title]").tooltip({ html: 'true'})
    })

$(".toggle-tab[data-token='row1_col4']").on('click', function() {
    setTimeout(function() {
        $("#row1_col5 .panel-title[title]").tooltip({ html: 'true', animation: 'true' }).tooltip('show');
        setTimeout(function() {
            $("#row1_col5 .panel-title[title]").tooltip('hide');
        }, 1500)
    }, 500)
});


//$( ".toggle-tab[data-token='row1_col1']" ).on('click',function(){$("#row1_col5 .panel-title[title]").tooltip('dispose');});
//$( ".toggle-tab[data-token='row1_col2']" ).on('click',function(){$("#row1_col5 .panel-title[title]").tooltip('dispose');});
//$( ".toggle-tab[data-token='row1_col3']" ).on('click',function(){$("#row1_col5 .panel-title[title]").tooltip('dispose');});
//$( ".toggle-tab[data-token='row1_col8']" ).on('click',function(){$("#row1_col5 .panel-title[title]").tooltip('dispose');});

require(['jquery', 'underscore', 'splunkjs/mvc', 'bootstrap.tab', 'splunkjs/mvc/simplexml/ready!'],
    function($, _, mvc) {

        /**
         * The below defines the tab handling logic.
         */

        // The normal, auto-magical Bootstrap tab processing doesn't work for us since it requires a particular
        // layout of HTML that we cannot use without converting the view entirely to simpleXML. So, we are
        // going to handle it ourselves.
        var hideTabTargets = function(tabSetClass) {

            var tabs = $('a[data-elements]');

            // If we are only applying this to a particular set of tabs, then limit the selector accordingly
            if (typeof tabSetClass !== 'undefined' && tabSetClass) {
                tabs = $('a.' + tabSetClass + '[data-elements]');
            }

            // Go through each toggle tab
            for (var c = 0; c < tabs.length; c++) {

                // Hide the targets associated with the tab
                var targets = $(tabs[c]).data("elements").split(",");

                for (var d = 0; d < targets.length; d++) {
                    $('#' + targets[d], this.$el).hide();
                }
            }
        };

        var selectTab = function(e) {

            // Stop if the tabs have no elements
            if ($(e.target).data("elements") === undefined) {
                console.warn("Yikes, the clicked tab has no elements to hide!");
                return;
            }

            // Determine if the set of tabs has a restriction on the classes to manipulate
            var tabSet = null;

            if ($(e.target).data("tab-set") !== undefined) {
                tabSet = $(e.target).data("tab-set");
            }

            var toToggle = $(e.target).data("elements").split(",");

            // Hide the tab content by default
            hideTabTargets(tabSet);

            // Now show this tabs toggle elements
            for (var c = 0; c < toToggle.length; c++) {
                $('#' + toToggle[c], this.$el).show();
            }

        };

        // Wire up the function to show the appropriate tab
        $('a[data-toggle="tab"]').on('shown', selectTab);

        // Show the first tab in each tab set
        $.each($('.nav-tabs'), function(index, value) {
            $('.toggle-tab', value).first().trigger('shown');
        });

        // Make the tabs into tabs
        $('#tabs', this.$el).tab();
        $('#tabs_content_table', this.$el).tab();

        /**
         * The code below handles the tokens that trigger when searches are kicked off for a tab.
         */

        // Get the tab token for a given tab name
        var getTabTokenForTabName = function(tab_name) {
            return tab_name; //"tab_" +
        }

        // Get all of the possible tab control tokens
        var getTabTokens = function() {
            var tabTokens = [];

            var tabLinks = $('#tabs > li > a');

            for (var c = 0; c < tabLinks.length; c++) {
                tabTokens.push(getTabTokenForTabName($(tabLinks[c]).data('token')));
            }

            return tabTokens;
        }

        // Clear all but the active tab control tokens
        var clearTabControlTokens = function() {
            console.info("Clearing tab control tokens");

            var tabTokens = getTabTokens();
            var activeTabToken = getActiveTabToken();
            var tokens = mvc.Components.getInstance("submitted");

            // Clear the tokens for all tabs except for the active one
            for (var c = 0; c < tabTokens.length; c++) {

                if (activeTabToken !== tabTokens[c]) {
                    tokens.set(tabTokens[c], undefined);
                }
            }
        }

        // Get the tab control token for the active tab
        var getActiveTabToken = function() {
            return $('#tabs > li.active > a').data('token');
        }

        // Set the token for the active tab
        var setActiveTabToken = function() {
            var activeTabToken = getActiveTabToken();

            var tokens = mvc.Components.getInstance("submitted");

            tokens.set(activeTabToken, '');
        }

        var setTokenForTab = function(e) {

            // Get the token for the tab
            var tabToken = getTabTokenForTabName($(e.target).data('token'));

            // Set the token
            var tokens = mvc.Components.getInstance("submitted");
            tokens.set(tabToken, '');

            console.info("Set the token for the active tab (" + tabToken + ")");

        }

        $('a[data-toggle="tab"]').on('shown', setTokenForTab);

        if (mvc.Components.get("submit")) {

            // Wire up the tab control tokenization
            var submit = mvc.Components.get("submit");

            submit.on("submit", function() {
                clearTabControlTokens();
            });

        }
        // Set the token for the selected tab
        setActiveTabToken();

    });

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    var r = parseInt(result[1], 16),
        g = parseInt(result[2], 16),
        b = parseInt(result[3], 16)
    return result ? r + ',' + g + ',' + b : null;
}