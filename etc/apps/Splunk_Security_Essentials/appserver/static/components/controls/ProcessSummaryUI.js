'use strict';


function cleanLink(link){
    return link.replace(/["'><]/g, "")
}



define(['jquery', 'underscore', 'module', "showdown", "components/data/sendTelemetry", "components/controls/BuildTile",
    "splunkjs/mvc/searchmanager",
    "splunkjs/mvc/simplexml/element/chart",
    "splunkjs/mvc/simplexml/element/map",
    "splunkjs/mvc/simplexml/element/table",
    "splunkjs/mvc/simplexml/element/single",
    "splunkjs/mvc/resultslinkview",
    'vendor/jquery.highlight/highlight.pack'
], function($, _, module, showdown, Telemetry, BuildTile, SearchManager, ChartElement, MapElement, TableElement, SingleElement, ResultsLinkView, hljs) {
    var config = module.config();
    return {

        runPreReqs: function runPreReqs(prereqs) {
            if (prereqs.length > 0) {

                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/services/apps/local?output_mode=json&count=0',
                    type: 'GET',
                    async: false,
                    success: function(returneddata) {
                        
                        for(let i = 0; i < returneddata['entry'].length; i++){
                            if(returneddata['entry'][i].name == "SplunkEnterpriseSecuritySuite"){
                                window.isESInstalled = true
                            }
                        }
                        if(!window.isESInstalled){
                            window.isESInstalled = false
                        }
                    },
                    error: function(xhr, textStatus, error) {
                        window.isESInstalled = false
                    }
                })
                window.aggregateStatus = {"total": 0, "success": 0, "failure": 0}
                window.datacheck = []
                    // console.log("Got " + prereqs.length + " prereqs!");
                $("<div id=\"row11\" class=\"dashboard-row dashboard-row1 splunk-view\">        <div id=\"panel11\" class=\"dashboard-cell last-visible splunk-view\" style=\"width: 100%;\">            <div class=\"dashboard-panel clearfix\" style=\"min-height: 0px;\"><h2 class=\"panel-title empty\"></h2><div id=\"view_22841\" class=\"fieldset splunk-view editable hide-label hidden empty\"></div>                                <div class=\"panel-element-row\">                    <div id=\"element11\" class=\"dashboard-element html splunk-view\" style=\"width: 100%;\">                        <div class=\"panel-body html\">                            <table class=\"table table-striped\" id=\"data_check_table\" >                            <tr><td>Data Check</td><td>Status</td><td>Open in Search</td><td>Resolution (if needed)</td></tr>                            </table>                        </div>                    </div>                </div>            </div>        </div>    </div>").insertBefore($(".fieldset").first())
                for (var i = 0; i < prereqs.length; i++) {
                    window.datacheck[i] = new Object
                        // create table entry including unique id for the status
                    $("#data_check_table tr:last").after("<tr><td>" + prereqs[i].name + "</td><td id=\"data_check_test" + i + "\"><img title=\"Checking...\" src=\"" + Splunk.util.make_full_url("/static//app/Splunk_Security_Essentials/images/general_images/loader.gif") + "\"></td><td><a target=\"_blank\" href=\"" + Splunk.util.make_full_url("/app/Splunk_Security_Essentials/search?q=" + encodeURI(prereqs[i].test)) + "\">Open in Search</a></td><td>" + prereqs[i].resolution + "</td></tr>")

                    // create search manager

                    window.datacheck[i].mainSearch = new SearchManager({
                        "id": "data_check_search" + i,
                        "cancelOnUnload": true,
                        "latest_time": "",
                        "status_buckets": 0,
                        "earliest_time": "0",
                        "search": prereqs[i].test,
                        "app": appName,
                        "auto_cancel": 90,
                        "preview": true,
                        "runWhenTimeIsUndefined": false
                    }, { tokens: true, tokenNamespace: "submitted" });


                    window.datacheck[i].myResults = window.datacheck[i].mainSearch.data('results', { output_mode: 'json', count: 0 });

                    window.datacheck[i].mainSearch.on('search:start', function(properties) {
                        window.aggregateStatus.total++;
                    });
                    window.datacheck[i].mainSearch.on('search:error', function(properties) {
                        var searchName = properties.content.request.label
                        var myCheckNum = searchName.substr(17, 20)
                        $("#row11").css("display", "block")
                        document.getElementById("data_check_test" + myCheckNum).innerHTML = "<img title=\"Error\" src=\"" + Splunk.util.make_full_url("/static//app/Splunk_Security_Essentials/images/general_images/err_ico.gif") + "\">";
                        // console.log("Data Check Failure code 3", searchName, myCheckNum, prereqs[myCheckNum])

                    });
                    window.datacheck[i].mainSearch.on('search:fail', function(properties) {

                        var searchName = properties.content.request.label
                        var myCheckNum = searchName.substr(17, 20)
                        $("#row11").css("display", "block")
                        document.getElementById("data_check_test" + myCheckNum).innerHTML = "<img title=\"Error\" src=\"" + Splunk.util.make_full_url("/static//app/Splunk_Security_Essentials/images/general_images/err_ico.gif") + "\">";
                        // console.log("Data Check Failure code 4", searchName, myCheckNum, prereqs[myCheckNum])

                    });
                    window.datacheck[i].mainSearch.on('search:done', function(properties) {
                        var searchName = properties.content.request.label
                        var myCheckNum = searchName.substr(17, 20)

                        // console.log("Got Results from Data Check Search", searchName, myCheckNum, properties);

                        if (window.datacheck[myCheckNum].mainSearch.attributes.data.resultCount == 0) {
                            document.getElementById("data_check_test" + myCheckNum).innerHTML = "<img title=\"Error\" src=\"" + Splunk.util.make_full_url("/static//app/Splunk_Security_Essentials/images/general_images/err_ico.gif") + "\">";
                            // console.log("Data Check Failure code 1", searchName, myCheckNum)
                            return;
                        }

                        window.datacheck[myCheckNum].myResults.on("data", function(properties) {

                            var searchName = properties.attributes.manager.id
                            var myCheckNum = searchName.substr(17, 20)
                            var data = window.datacheck[myCheckNum].myResults.data().results;

                            status = false;
                            if (typeof data[0][prereqs[myCheckNum].field] !== "undefined") {
                                status = true;
                                if (typeof prereqs[myCheckNum].greaterorequalto !== "undefined") {
                                    if (data[0][prereqs[myCheckNum].field] >= prereqs[myCheckNum].greaterorequalto) {
                                        status = true;
                                    } else {
                                        status = false;
                                    }
                                }
                            }

                            if (status == "true") {
                                document.getElementById("data_check_test" + myCheckNum).innerHTML = "<img title=\"Success\" src=\"" + Splunk.util.make_full_url("/static//app/Splunk_Security_Essentials/images/general_images/ok_ico.gif") + "\">";
                                // console.log("Data Check success", searchName, myCheckNum, prereqs[myCheckNum])
                                window.aggregateStatus.success++;
                            } else {
                                document.getElementById("data_check_test" + myCheckNum).innerHTML = "<img title=\"Error\" src=\"" + Splunk.util.make_full_url("/static//app/Splunk_Security_Essentials/images/general_images/err_ico.gif") + "\">";
                                $("#row11").css("display", "block")
                                window.aggregateStatus.failure++;
                                    // console.log("Data Check Failure code 2", searchName, myCheckNum, prereqs[myCheckNum])
                            }
                            if(window.aggregateStatus.total > 0 && window.aggregateStatus.total == window.aggregateStatus.success + window.aggregateStatus.failure){
                                let myInterval = setInterval(function(){
                                    if($(".schedule-alert-button").length > 0 && window.isESInstalled){
                                        let myAlert = $(".schedule-alert-button").first().clone().addClass("btn-primary").css("float", "right").click(function(){
                                            $(".schedule-alert-button").last().click()
                                        })
                                        if(window.isESInstalled){
                                            myAlert.text( _("Schedule in ES").t() )
                                        }
                                        $(".panel-body:contains(Data Check)").prepend(myAlert)
                                        clearInterval(myInterval)
                                    }
                                    
                                }, 500)
                            }

                        });
                    });

                }
            }
        },
        GenerateShowcaseHTMLBody: function GenerateShowcaseHTMLBody(summary, ShowcaseInfo, textonly) {
            let markdown = new showdown.converter()
            setTimeout(function(){
                require([
                'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitreattack&locale=' + window.localeString,
                'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitrepreattack&locale=' + window.localeString], function(mitre_attack, mitre_preattack){
                    // pre-loading these
                })
            }, 1000)

            let translatedLabels = {}
            try{
                if(localStorage['Splunk_Security_Essentials-i18n-labels-' + window.localeString] != undefined){
                    translatedLabels = JSON.parse(localStorage['Splunk_Security_Essentials-i18n-labels-' + window.localeString])
                }
            }catch(error){}

            if (!textonly || textonly == false) {

                window.summary = summary
            }
            //var Template = "<div class=\"detailSectionContainer expands\" style=\"display: block; border: black solid 1px; padding-top: 0; \"><h2 style=\"background-color: #F0F0F0; line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\" onclick='$(\"#SHORTNAMESection\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\")}else{$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\")} return false;'>&nbsp;&nbsp;<i id=\"SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE</a></h2><div style=\"display: none; padding: 8px;\" id=\"SHORTNAMESection\">"
            var Template = "<table id=\"" + summary.id + "SHORTNAME_table\" class=\"dvexpand table table-chrome\"><thead><tr><th class=\"expands\"><h2 style=\"line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\" onclick='$(\"#" + summary.id + "SHORTNAMESection\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#" + summary.id + "SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#" + summary.id + "SHORTNAME_table\").addClass(\"expanded\"); $(\"#" + summary.id + "SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#" + summary.id + "SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#" + summary.id + "SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#" + summary.id + "SHORTNAME_table\").removeClass(\"expanded\");  $(\"#" + summary.id + "SHORTNAME_table\").addClass(\"table-chrome\"); } return false;'>&nbsp;&nbsp;<i id=\"" + summary.id + "SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE</a></h2></th></tr></thead><tbody><tr><td class=\"summaryui-detailed-data\" style=\"display: none; border-top-width: 0;\" id=\"" + summary.id + "SHORTNAMESection\">"
            var Template_OpenByDefault = "<table id=\"" + summary.id + "SHORTNAME_table\" class=\"dvexpand expanded table table-chrome\"><thead><tr><th class=\"expands\"><h2 style=\"line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\" onclick='$(\"#" + summary.id + "SHORTNAMESection\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#" + summary.id + "SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#" + summary.id + "SHORTNAME_table\").addClass(\"expanded\"); $(\"#" + summary.id + "SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#" + summary.id + "SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#" + summary.id + "SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#" + summary.id + "SHORTNAME_table\").removeClass(\"expanded\");  $(\"#" + summary.id + "SHORTNAME_table\").addClass(\"table-chrome\"); } return false;'>&nbsp;&nbsp;<i id=\"" + summary.id + "SHORTNAME_arrow\" class=\"icon-chevron-down\"></i> TITLE</a></h2></th></tr></thead><tbody><tr><td class=\"summaryui-detailed-data\" style=\"display: block; border-top-width: 0;\" id=\"" + summary.id + "SHORTNAMESection\">"

            var areaText = ""
            if (typeof summary.category != "undefined") {
                areaText = "<p><h2>" + _("Category").t() + "</h2>" + summary.category.split("|").join(", ") + "</p>"
            }
            var usecaseText = ""
            if (typeof summary.category != "undefined") {
                usecaseText = "<p><h2>" + _("Use Case").t() + "</h2>" + summary.usecase.split("|").join(", ") + "</p>"
            }

            // var showSPLButton = '<div id="showSPLMenu" />' // Line-by-Line SPL Documentation Button
                // What follows is Advanced SPL Option
            var checkedtext = ""
            if (typeof localStorage['sse-splMode'] != "undefined" && localStorage['sse-splMode'] == "true")
                checkedtext = " checked"

                // $("#DemoModeSwitch").html('<div class="tooltipcontainer  filterItem" style="margin-right: 45px;"><label class="filterswitch floatright" style="margin-left: 8px;">' /* + tooltipText*/ + '<input type="checkbox" id="FILTER_DEMOMODE" name="FILTER_DEMOMODE" ' + demoModeInputSetting + '><span class="filterslider "></span></label><div class="filterLine">Demo Mode <a href=\"#\" data-placement=\"bottom\" onclick=\"return false;\" class=\"icon-info\" title=\"SPL is hidden by default and <br />demo searches show up first.\"> </a></div></div> ')
            var showAdvancedMode = '<div style="width: 300px; margin-top: 15px;" class="tooltipcontainer filterItem"><label class="filterswitch"><input type="checkbox" id="enableAdvancedSPL" ' + checkedtext + '><span class="filterslider "></span></label><div style="display: inline;" class="filterLine">Enable SPL Mode</div></div><div>Turning this on will show searches, along with the buttons that will allow saving searches. This will be saved in your browser, and be the default for any other content you view, but won\'t impact other users.</div> '

            if ((!textonly || textonly == false) && typeof summary.hideSPLMode != "undefined" && summary.hideSPLMode == true) {
                showAdvancedMode = ""
                $("#fieldset1").hide() // Search Bar
                $("#row11").hide() // Prereq 
            }

            var showSPLText = ""
            if ((!textonly || textonly == false) && summary.hasSearch == "Yes" && ["showcase_first_seen_demo", "showcase_simple_search", "showcase_standard_deviation"].indexOf(splunkjs.mvc.Components.getInstance("env").toJSON()["page"]) >= 0) {

                showSPLText = Template.replace(/SHORTNAME/g, "showSPL").replace("TITLE", "SPL Mode")
                showSPLText +=  showAdvancedMode + "</td></tr></table>"

            }

            var knownFPText = ""
            if (typeof summary.knownFP != "undefined" && summary.knownFP != "") {
                knownFPText = Template.replace(/SHORTNAME/g, "knownFP").replace("TITLE", _("Known False Positives").t()) + markdown.makeHtml(summary.knownFP) + "</td></tr></table>" // "<h2>Known False Positives</h2><p>" + summary.knownFP + "</p>"
            }
            // console.log("Checking How to Implement", summary.howToImplement)
            var howToImplementText = ""
            if (typeof summary.howToImplement != "undefined" && summary.howToImplement != "") {
                howToImplementText = Template.replace(/SHORTNAME/g, "howToImplement").replace("TITLE", _("How to Implement").t()) + markdown.makeHtml(summary.howToImplement) + "</td></tr></table>" // "<h2>How to Implement</h2><p>" + summary.howToImplemement + "</p>"

            }

            var eli5Text = ""
            if (typeof summary.eli5 != "undefined" && summary.eli5 != "") {
                eli5Text = Template.replace(/SHORTNAME/g, "eli5").replace("TITLE", _("Detailed Search Explanation").t()) + markdown.makeHtml(summary.eli5) + "</td></tr></table>" // "<h2>Detailed Search Explanation</h2><p>" + summary.eli5 + "</p>"
            }

            var searchStringText = ""
            if (typeof summary.search != "undefined" && summary.search != "") {
                let searchjq = $("<pre>").attr("class", "search").append($('<code class="spl">').text(summary.search))
                // searchStringText = Template.replace(/SHORTNAME/g, "searchString").replace("TITLE", _("Search").t()) + searchjq[0].outerHTML + "</td></tr></table>"
                let button = "<a class=\"btn external drilldown-link\" target=\"_blank\" style=\"background-color: #76BD64; margin-bottom: 10px; color: white;\" href=\"search?q=" + encodeURIComponent(summary.search) + "\">" + _("Open in Search").t() + "</a>"
                if(summary['open_search_panel'] && summary['open_search_panel'] == false){
                    searchStringText = Template.replace(/SHORTNAME/g, "searchString").replace("TITLE", _("Search").t()) + searchjq[0].outerHTML + button + "</td></tr></table>"
                }else{
                    searchStringText = Template_OpenByDefault.replace(/SHORTNAME/g, "searchString").replace("TITLE", _("Search").t()) + searchjq[0].outerHTML + button + "</td></tr></table>"
                }
            }


            var SPLEaseText = ""
            if (typeof summary.SPLEase != "undefined" && summary.SPLEase != "") {
                SPLEaseText = "<h2>" + _("SPL Difficulty").t() + "</h2><p>" + summary.SPLEase + "</p>"
            }


            var operationalizeText = ""
            if (typeof summary.operationalize != "undefined" && summary.operationalize != "") {
                operationalizeText = Template.replace(/SHORTNAME/g, "operationalize").replace("TITLE", _("How To Respond").t()) + markdown.makeHtml(summary.operationalize) + "</td></tr></table>" // "<h2>Handle Alerts</h2><p>" + summary.operationalize + "</p>"
            }

            var gdprText = ""
            if (typeof summary.gdprtext != "undefined" && summary.gdprtext != "") {
                gdprText = Template.replace(/SHORTNAME/g, "gdprtext").replace("TITLE", _("GDPR Relevance").t()) + markdown.makeHtml(summary.gdprtext) + "</td></tr></table>" // "<h2>Handle Alerts</h2><p>" + summary.operationalize + "</p>"
            }

            var relevance = ""
            if (typeof summary.relevance != "undefined" && summary.relevance != "") {
                relevance = "<h2>" + _("Security Impact").t() + "</h2><p>" + markdown.makeHtml(summary.relevance) + "</p>" // "<h2>Handle Alerts</h2><p>" + summary.operationalize + "</p>"
            }


            let appsToExcludePartnerDisclaimer = ["Splunk_Security_Essentials", "Splunk_App_for_Enterprise_Security", "Enterprise_Security_Content_Update", "Splunk_Phantom", "Splunk_User_Behavior_Analytics", "Custom"]
            let companyTextBanner = ""
            let companyTextDescription = ""
            let companyTextSectionLabel = ""
            if(summary.company_name || summary.company_logo || summary.company_description || summary.company_link){
                
                // company_logo company_logo_width company_logo_height company_description company_link
                companyTextBanner = "<h2>" + _("Content Producer").t() + "</h2>"
                if(summary.company_name){
                    if(! summary.company_logo){
                        companyTextBanner += "<p>" + Splunk.util.sprintf(_("Content supplied by %s").t(), _(summary.company_name).t()) + "</p>"
                    }
                    companyTextSectionLabel = "About " + _(summary.company_name).t()
                    
                }else{
                    companyTextSectionLabel = "About Content Producer" //<p><h2>Full Splunk Capabilities</h2></p>"
                }
                companyTextDescription = Template.replace(/SHORTNAME/g, "companyDescription").replace("TITLE", companyTextSectionLabel) //<p><h2>Full Splunk Capabilities</h2></p>"
                if(summary.company_logo){
                    let style = ""
                    let max_width = 350
                    let actual_width = ""
                    let max_height = 100
                    let actual_height = ""
                    if(summary.company_logo_width){
                        summary.company_logo_width = parseInt(summary.company_logo_width)
                        if(summary.company_logo_width > max_width){
                            actual_width = max_width
                        }else{
                            actual_width = summary.company_logo_width
                        }
                        try{
                            style = "width: " + actual_width + "px; "
                        }catch(error){
                            style = "";   
                        }
                    }
                    if(summary.company_logo_height){
                        summary.company_logo_height = parseInt(summary.company_logo_height)
                        if(actual_width != ""){
                            actual_height = summary.company_logo_height * (actual_width / summary.company_logo_width)
                            if(actual_height > max_height){
                                actual_height = max_height
                                actual_width = summary.company_logo_width * (actual_height / summary.company_logo_height)
                                style = "width: " + actual_width + "px; "
                            }
                        }else if(summary.company_logo_height > max_height){
                            actual_height = max_height
                        }else{
                            actual_height = summary.company_logo_height
                        }
                        try{
                            style += "height: " + actual_height + "px; "
                        }catch(error){
                            style = "";   
                        }
                    }
                    if(style == ""){
                        style = "max-width: 350px;"
                    }
                    if(summary.company_link){
                        companyTextDescription += "<a target=\"_blank\" href=\"" + cleanLink(summary.company_link) + "\"><img style=\"margin: 5px; " + style + "\" src=\"" + cleanLink(summary.company_logo) + "\" /></a>"
                        companyTextBanner += "<a target=\"_blank\" href=\"" + cleanLink(summary.company_link) + "\"><img style=\"margin: 5px; " + style + "\" src=\"" + cleanLink(summary.company_logo) + "\" /></a>"
                    }else{
                        companyTextDescription += "<img style=\"margin: 5px; " + style + "\" src=\"" + cleanLink(summary.company_logo) + "\" />"
                        companyTextBanner += "<img style=\"margin: 5px; " + style + "\" src=\"" + cleanLink(summary.company_logo) + "\" />"
                    }
                }
                if(summary.company_description){
                    companyTextDescription += "<p>" + markdown.makeHtml(_(summary.company_description).t().replace(/\\n/g, "<br/>")) + "</p>"
                }
                if(summary.company_link){
                    companyTextDescription += "<a class=\"btn external drilldown-link\" target=\"_blank\" style=\"background-color: #3498db; margin-bottom: 10px; color: white;\" href=\"" + cleanLink(summary.company_link) + "\">" + _("Learn More...").t() + "</a>"
                }

                companyTextDescription += "</td></tr></table>"
            }else if (typeof summary.channel != "undefined" && appsToExcludePartnerDisclaimer.indexOf(summary.channel) == -1) {
                companyTextDescription = Template.replace(/SHORTNAME/g, "companyDescription").replace("TITLE", "About Content Provider") +
                    Splunk.util.sprintf(_("This content provider didn't provide any information about their organization. The content provided is %s.").t(), summary.channel)
                    + "</td></tr></table>" 
            }


            let additionalContextText = ""
            if(typeof summary["additional_context"] == "object" && summary["additional_context"].length){
                // Written to support optional context objects provided by partners
                for(let i = 0; i < summary["additional_context"].length; i++){
                    let obj = summary["additional_context"][i];
                    let title = "Additional Context"
                    
                    if(obj.title){
                        title = obj.title;
                    }
                    let localHTML = Template.replace(/SHORTNAME/g, "additional_context_" + i).replace("TITLE", title)
                    if(obj['open_panel']){
                        localHTML = Template_OpenByDefault.replace(/SHORTNAME/g, "additional_context_" + i).replace("TITLE", title)
                    }
                    if(obj.detail){
                        localHTML += "<p>" + markdown.makeHtml(_(obj.detail).t().replace(/\\n/g, "<br/>")) + "</p>"
                    }
                    
                    //Splunk.util.sprintf(_("This content is made available by a third-party (“Third-Party Content”) and is subject to the provisions governing Third-Party Content set forth in the Splunk Software License Agreement. Splunk neither controls nor endorses, nor is Splunk responsible for, any Third-Party Content, including the accuracy, integrity, quality, legality, usefulness or safety of Third-Party Content. Use of such Third-Party Content is at the user’s own risk and may be subject to additional terms, conditions and policies applicable to such Third-Party Content (such as license terms, terms of service or privacy policies of the provider of such Third-Party Content). <br/><br/>For information on the provider of this Third-Party Content, please review the \"%s\" section below.").t(), companyTextSectionLabel)
                    if(obj.search){
                        let label = "Search"
                        if(obj.search_label){
                            label = obj.search_label;
                        }
                        localHTML += "<h3>" + label + "</h3>"
                        let lang = "spl"
                        
                        if(obj.search_lang){
                            lang = obj.search_lang;
                        }
                        localHTML += $("<div>").append($("<pre>").attr("class", "search").append($("<code>").attr("class", lang).text(obj.search))).html()
                        if(lang == "spl"){
                            localHTML += "<a class=\"btn external drilldown-link\" target=\"_blank\" style=\"background-color: #76BD64; margin-bottom: 10px; color: white;\" href=\"search?q=" + encodeURIComponent(obj.search) + "\">" + _("Open in Search").t() + "</a>";
                        }
                    }
                    if(obj.link){
                        localHTML += "<a class=\"btn external drilldown-link\" target=\"_blank\" style=\"background-color: #3498db; margin-bottom: 10px; color: white;\" href=\"" + cleanLink(obj.link) + "\">" + _("Learn More...").t() + "</a>"
                    }
                    localHTML += "</td></tr></table>" 
                    additionalContextText += localHTML
                }
            }

            let partnerText = ""
            
            if (typeof summary.channel != "undefined" && appsToExcludePartnerDisclaimer.indexOf(summary.channel) == -1) {
                partnerText = Template.replace(/SHORTNAME/g, "externalText").replace("TITLE", _("External Content").t()) + 
                Splunk.util.sprintf(_("This content is made available by a third-party (“Third-Party Content”) and is subject to the provisions governing Third-Party Content set forth in the Splunk Software License Agreement. Splunk neither controls nor endorses, nor is Splunk responsible for, any Third-Party Content, including the accuracy, integrity, quality, legality, usefulness or safety of Third-Party Content. Use of such Third-Party Content is at the user’s own risk and may be subject to additional terms, conditions and policies applicable to such Third-Party Content (such as license terms, terms of service or privacy policies of the provider of such Third-Party Content). <br/><br/>For information on the provider of this Third-Party Content, please review the \"%s\" section below.").t(), companyTextSectionLabel)
                + "</td></tr></table>" 
            }



            var descriptionText = "<h2>" + _("Description").t() + "</h2>" // "<h2>Handle Alerts</h2><p>" + summary.operationalize + "</p>"
            var alertVolumeText = "<h2>" + _("Alert Volume").t() + "</h2>"




            if (summary.alertvolume == "Very Low" || summary.description.match(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Very Low/)) {
                alertVolumeText += _("Very Low").t() + ' <a class="dvPopover" id="alertVolumetooltip" href="#" title="Alert Volume: Very Low" data-placement="right" data-toggle="popover" data-trigger="hover" data-content="' + _('An alert volume of Very Low indicates that a typical environment will rarely see alerts from this search, maybe after a brief period of tuning. This search should trigger infrequently enough that you could send it directly to the SOC as an alert, although you should also send it into a data-analysis based threat detection solution, such as Splunk UBA (or as a starting point, Splunk ES\'s Risk Framework)').t() + '">(?)</a>'
                descriptionText += markdown.makeHtml(summary.description.replace(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Very Low/, ''))
            } else if (summary.alertvolume == "Low" || summary.description.match(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Low/)) {
                alertVolumeText += _("Low").t() + ' <a class="dvPopover" id="alertVolumetooltip" href="#" title="Alert Volume: Low" data-placement="right" data-toggle="popover" data-trigger="hover" data-content="' + _("An alert volume of Low indicates that a typical environment will occasionally see alerts from this search -- probably 0-1 alerts per week, maybe after a brief period of tuning. This search should trigger infrequently enough that you could send it directly to the SOC as an alert if you decide it is relevant to your risk profile, although you should also send it into a data-analysis based threat detection solution, such as Splunk UBA (or as a starting point, Splunk ES\'s Risk Framework)").t() + '">(?)</a>'
                descriptionText += markdown.makeHtml(summary.description.replace(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Low/, ''))
            } else if (summary.alertvolume == "Medium" || summary.description.match(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Medium/)) {
                alertVolumeText += _("Medium").t() + ' <a class="dvPopover" id="alertVolumetooltip" href="#" title="Alert Volume: Medium" data-placement="right" data-toggle="popover" data-trigger="hover" data-content="' + _("An alert volume of Medium indicates that you\'re likely to see one to two alerts per day in a typical organization, though this can vary substantially from one organization to another. It is recommended that you feed these to an anomaly aggregation technology, such as Splunk UBA (or as a starting point, Splunk ES\'s Risk Framework)").t() + '">(?)</a>'
                descriptionText += markdown.makeHtml(summary.description.replace(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Medium/, ''))
            } else if (summary.alertvolume == "High" || summary.description.match(/<b>\s*Alert Volume:*\s*<\/b>:*\s*High/)) {
                alertVolumeText += _("High").t() + ' <a class="dvPopover" id="alertVolumetooltip" href="#" title="Alert Volume: High" data-placement="right" data-toggle="popover" data-trigger="hover" data-content="' + _("An alert volume of High indicates that you\'re likely to see several alerts per day in a typical organization, though this can vary substantially from one organization to another. It is highly recommended that you feed these to an anomaly aggregation technology, such as Splunk UBA (or as a starting point, Splunk ES\'s Risk Framework)").t() + '">(?)</a>'
                descriptionText += markdown.makeHtml(summary.description.replace(/<b>\s*Alert Volume:*\s*<\/b>:*\s*High/, ''))
            } else if (summary.alertvolume == "Very High" || summary.description.match(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Very High/)) {
                alertVolumeText += _("Very High").t() + ' <a class="dvPopover" id="alertVolumetooltip" href="#" title="Alert Volume: Very High" data-placement="right" data-toggle="popover" data-trigger="hover" data-content="' + _("An alert volume of Very High indicates that you\'re likely to see many alerts per day in a typical organization. You need a well thought out high volume indicator search to get value from this alert volume. Splunk ES\'s Risk Framework is a starting point, but is probably insufficient given how common these events are. It is highly recommended that you either build correlation searches based on the output of this search, or leverage Splunk UBA with it\'s threat models to surface the high risk indicators.").t() + '">(?)</a>'
                descriptionText += markdown.makeHtml(summary.description.replace(/<b>\s*Alert Volume:*\s*<\/b>:*\s*Very High/, ''))
            } else {
                alertVolumeText += summary.description.replace(/(<b>\s*Alert Volume:.*?)<\/p>.*/, '$1 <a class="dvPopover" id="alertVolumetooltip" href="#" title="Alert Volume" data-placement="right" data-toggle="popover" data-trigger="hover" data-content="' + _("The alert volume indicates how often a typical organization can expect this search to fire. On the Very Low / Low side, alerts should be rare enough to even send these events directly to the SIEM for review. Oh the High / Very High side, your SOC would be buried under the volume, and you must send the events only to an anomaly aggregation and threat detection solution, such as Splunk UBA (or for a partial solution, Splunk ES\'s risk framework). To that end, *all* alerts, regardless of alert volume, should be sent to that anomaly aggregation and threat detection solution. More data, more indicators, should make these capabilites stronger, and make your organization more secure.").t() + '">(?)</a>')
                descriptionText += markdown.makeHtml(summary.description.replace(/(<b>\s*Alert Volume:.*?)(?:<\/p>)/, ''))
            }

            //alertVolumeText += "</div></div>"

            //relevance = summary.relevance ? "<p><h2>Security Impact</h2>" +  + "</p>" : ""

            per_instance_help = ""
            if (typeof summary.help != "undefined" && summary.help && summary.help != "" && summary.help != undefined && summary.help != null && summary.help != "undefined" && summary.help.indexOf("Help not needed") != 0) {
                // console.log("Got help for summary", summary.id, summary)
                per_instance_help = Template.replace(/SHORTNAME/g, "help").replace("TITLE", "Help")
                if( $("h3:contains(How Does This Detection Work)").length > 0){
                    per_instance_help += $("h3:contains(How Does This Detection Work)").parent().html()
                }
                per_instance_help += "<p><h3>" + summary.name + " Help</h3></p>" + markdown.makeHtml(summary.help)
                per_instance_help += "</td></tr></table>"
            }
            panelStart = "<div id=\"rowDescription\" class=\"dashboard-row dashboard-rowDescription splunk-view\">        <div id=\"panelDescription\" class=\"dashboard-cell last-visible splunk-view\" style=\"width: 100%;\">            <div class=\"dashboard-panel clearfix\" style=\"min-height: 0px;\"><h2 class=\"panel-title empty\"></h2><div id=\"view_description\" class=\"fieldset splunk-view editable hide-label hidden empty\"></div>                                <div class=\"panel-element-row\">                    <div id=\"elementdescription\" class=\"dashboard-element html splunk-view\" style=\"width: 100%;\">                        <div class=\"panel-body html\"> <div class=\"contentDescription\" data-showcaseid=\"" + summary.id + "\" id=\"contentDescription\"> "
            panelEnd = "</div></div>                    </div>                </div>            </div>        </div>    </div>"

            //console.log("Here's my summary!", summary)

            var relatedUseCasesText = ""
            if ((!textonly || textonly == false) && typeof summary.relatedUseCases != "undefined" && summary.relatedUseCases.length > 0) {
                relatedUseCasesText = "<h2>" + _("Related Use Cases").t() + "</h2>"
                var tiles = $('<ul class="showcase-list"></ul>')
                for (var i = 0; i < summary.relatedUseCases.length; i++) {
                    if (typeof ShowcaseInfo['summaries'][summary.relatedUseCases[i]] != "undefined")
                        tiles.append($("<li style=\"width: 230px; height: 320px\"></li>").append(BuildTile.build_tile(ShowcaseInfo['summaries'][summary.relatedUseCases[i]], true)))

                }
                relatedUseCasesText += '<ul class="showcase-list">' + tiles.html() + '</ul>'

            }
            
            let phantomPlaybookText = ""
            if ((!textonly || textonly == false) && typeof summary.phantomPlaybooks != "undefined" && summary.phantomPlaybooks.length > 0) {
                phantomPlaybookText = "<h2>" + _("Phantom Playbooks").t() + "</h2>"
                var tiles = $('<ul class="showcase-list"></ul>')
                for (var i = 0; i < summary.phantomPlaybooks.length; i++) {
                    if (typeof ShowcaseInfo['summaries'][summary.phantomPlaybooks[i]] != "undefined")
                        tiles.append($("<li style=\"width: 230px; height: 320px\"></li>").append(BuildTile.build_tile(ShowcaseInfo['summaries'][summary.phantomPlaybooks[i]], true)))

                }
                phantomPlaybookText += '<ul class="showcase-list">' + tiles.html() + '</ul>'

            }

            var similarUseCasesText = ""
            if ((!textonly || textonly == false) && typeof summary.similarUseCases != "undefined" && summary.similarUseCases.length > 0) {
                similarUseCasesText = "<h2>" + _("Similar Use Cases").t() + "</h2><p>Sometimes Splunk will solve the same problem in multiple ways, based on greater requirements. What we can do with a simple example for one data source at Stage 1 of the Journey, we can do across all datasets at Stage 2, and with more impact at Stage 4. Here are other versions of the same underlying technique.</p>";
                var tiles = $('<ul class="showcase-list"></ul>')
                for (var i = 0; i < summary.similarUseCases.length; i++) {
                    if (typeof ShowcaseInfo['summaries'][summary.similarUseCases[i]] != "undefined")
                        tiles.append($("<li style=\"width: 230px; height: 320px\"></li>").append(BuildTile.build_tile(ShowcaseInfo['summaries'][summary.similarUseCases[i]], true)))

                }
                similarUseCasesText += '<ul class="showcase-list">' + tiles.html() + '</ul>'
                    //  console.log("Here's my similar use cases..", similarUseCasesText)

            }


            var fullSolutionText = ""
            // if (typeof summary.fullSolution != "undefined") {
            //     fullSolutionText += "<br/><h2>" + _("Relevant Splunk Premium Solution Capabilities").t() + "</h2><button class=\"btn\" onclick=\"triggerModal(window.fullSolutionText); return false;\">Find more Splunk content for this Use Case</button>"

            // }

            var otherSplunkCapabilitiesText = ""
            if (relatedUseCasesText != "" || similarUseCasesText != "" || fullSolutionText != "" ) {
                otherSplunkCapabilitiesText = Template.replace(/SHORTNAME/g, "fullSolution").replace("TITLE", "Related Splunk Capabilities") //<p><h2>Full Splunk Capabilities</h2></p>"
                otherSplunkCapabilitiesText += similarUseCasesText
                otherSplunkCapabilitiesText += relatedUseCasesText
                // otherSplunkCapabilitiesText += phantomPlaybookText
                otherSplunkCapabilitiesText += fullSolutionText
                otherSplunkCapabilitiesText += "</td></tr></table>"
            }
            var phantomText = ""
            if ( phantomPlaybookText != "") {
                phantomText = Template.replace(/SHORTNAME/g, "phantomPlaybookContent").replace("TITLE", "Recommended Phantom Playbooks") //<p><h2>Full Splunk Capabilities</h2></p>"
                phantomText += phantomPlaybookText
                phantomText += "</td></tr></table>"
            }

            var supportingImagesText = ""
            if (typeof summary.images == "object" && typeof summary.images.length == "number" && summary.images.length > 0) {
                supportingImagesText = "<table id=\"SHORTNAME_table\" class=\"dvexpand table table-chrome\"><thead><tr><th class=\"expands\"><h2 style=\"line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\" onclick='$(\"#SHORTNAMESection\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#SHORTNAME_table\").addClass(\"expanded\"); $(\"#SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#SHORTNAME_table\").removeClass(\"expanded\");  $(\"#SHORTNAME_table\").addClass(\"table-chrome\"); } ; window.DoImageSubtitles(); return false;'>&nbsp;&nbsp;<i id=\"SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE</a></h2></th></tr></thead><tbody><tr><td style=\"display: none; border-top-width: 0;\" id=\"SHORTNAMESection\">"
                supportingImagesText = supportingImagesText.replace(/SHORTNAME/g, "supportingImages").replace("TITLE", "Screenshots")
                var images = ""
                for (var i = 0; i < summary.images.length; i++) {

                    images += "<img crossorigin=\"anonymous\" class=\"screenshot\" setwidth=\"650\" zoomin=\"true\" src=\"" + summary.images[i].path + "\" title=\"" + summary.images[i].label + "\" />"
                }
                supportingImagesText += images
                supportingImagesText += "</td></tr></table>"
            }

            var BookmarkStatus = "<h2 class=\"bookmarkDisplayComponents\" style=\"margin-bottom: 5px;\">Bookmark Status</h2><h3 class=\"bookmarkDisplayComponents\" style=\"margin-top: 0; margin-bottom: 15px;\"><a class=\"showcase_bookmark_status\" href=\"#\" onclick=\"popBookmarkOptions(this); return false;\">" + summary.bookmark_status_display + "</a></h3> "

            if (summary.bookmark_notes && summary.bookmark_notes != "" && summary.bookmark_notes != null) {
                BookmarkStatus += "<div class=\"bookmarkDisplayComponents\" data-showcaseid=\"" + summary.id + "\" class=\"bookmarkNotes\"><h3 style=\"margin-bottom: 5px;\">Bookmark Notes</h3><p>" + summary.bookmark_notes + "</p></div>"
            } else {
                BookmarkStatus += "<div class=\"bookmarkDisplayComponents\" style=\"display: none; reallyshow: none;\" data-showcaseid=\"" + summary.id + "\" class=\"bookmarkNotes\"><h3 style=\"margin-bottom: 5px;\">Bookmark Notes</h3><p>" + summary.bookmark_notes + "</p></div>"

            }

            var DataAvailabilityStatus = "<h2 style=\"margin-bottom: 5px;\"><span data-toggle=\"tooltip\" title=\"" + _("Data Availability is driven by the Data Inventory dashboard, and allows Splunk Security Essentials to provide recommendations for available content that fits your needs and uses your existing data.").t() + "\">" + _("Data Availability").t() + "</span> <a href=\"data_inventory\" target=\"_blank\" class=\"external drilldown-link\"></a></h2><h3 style=\"margin-top: 0; margin-bottom: 15px;\"><a href=\"#\" onclick=\"data_available_modal(this); return false;\">" + summary.data_available + "</a></h3> "
            var Stage = "<h2 style=\"margin-bottom: 5px;\">Journey</h2><h3 style=\"margin-top: 0; margin-bottom: 15px;\"><a target=\"_blank\" class=\"external drilldown-icon\" href=\"journey?stage=" + summary.journey.replace(/Stage_/g, "") + "\">" + summary.journey.replace(/_/g, " ") + "</a></h3> "

            var datasourceText = ""
            if (typeof summary.datasources == "undefined" && summary.datasource != "undefined") {
                summary.datasources = summary.datasource
            }
            if (typeof summary.datasources != "undefined") {
                datasources = summary.datasources.split("|")
                if (datasources.length > 0 && datasourceText == "") {
                    datasourceText = "<h2>Data Sources</h2>"
                }
                for (var i = 0; i < datasources.length; i++) {
                    var link = datasources[i].replace(/[^\w\- ]/g, "")
                    var description = datasources[i]
                    datasourceText += "<div class=\"coredatasource\"><a target=\"_blank\" href=\"data_source?datasource=" + link + "\">" + description + "</a></div>"
                }
                datasourceText += "<br style=\"clear: both;\"/>"
            }



            var mitreText = ""
            if (typeof summary.mitre_tactic_display != "undefined" && summary.mitre_tactic_display != "") {
                let mitre = summary.mitre_tactic_display.split("|")
                if (mitre.indexOf("None") >= 0) {
                    mitre = mitre.splice(mitre.indexOf("None"), 1);
                }
                if (mitre.length > 0 && mitreText == "") {
                    mitreText = "<h2 style=\"margin-bottom: 5px;\">" + _("MITRE ATT&CK Tactics").t() + "  (Click for Detail)</h2>"
                }
                let numAdded = 0;
                for (var i = 0; i < mitre.length; i++) {
                    if (mitre[i] == "None") {
                        continue;
                    }
                    numAdded++;
                    mitreText += "<div style=\"cursor: pointer\" onclick=\"showMITREElement('x-mitre-tactic', '" + mitre[i] + "')\" class=\"primary mitre_tactic_displayElements\">" + mitre[i] + "</div>"
                }
                mitreText += "<br style=\"clear: both;\"/>"
                if (numAdded == 0) {
                    mitreText = ""
                }
            }

            var mitreTechniqueText = ""
            if (typeof summary.mitre_technique_display != "undefined" && summary.mitre_technique_display != "") {
                let mitre = summary.mitre_technique_display.split("|")
                if (mitre.indexOf("None") >= 0) {
                    mitre = mitre.splice(mitre.indexOf("None"), 1);
                }
                if (mitre.length > 0 && mitreTechniqueText == "") {
                    mitreTechniqueText = "<h2 style=\"margin-bottom: 5px;\">" + _("MITRE ATT&CK Techniques").t() + "  (Click for Detail)</h2>"
                }
                let numAdded = 0;
                for (var i = 0; i < mitre.length; i++) {
                    if (mitre[i] == "None") {
                        continue;
                    }
                    numAdded++;
                    mitreTechniqueText += "<div style=\"cursor: pointer\" onclick=\"showMITREElement('attack-pattern', '" + mitre[i] + "')\" class=\"primary mitre_technique_displayElements\">" + mitre[i] + "</div>"
                }
                mitreTechniqueText += "<br style=\"clear: both;\"/>"
                if (numAdded == 0) {
                    mitreTechniqueText = ""
                }
            }
            function showGroup(groupName){
                // console.log("Got a group!", groupName)

                require(["underscore", 
                "jquery", 
                'components/controls/Modal',
                'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitreattack&locale=' + window.localeString,
                'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitrepreattack&locale=' + window.localeString],
                function(_, 
                    $, 
                    Modal,
                    mitre_attack, 
                    mitre_preattack){ 

                        let relevantGroups = [groupName]
                        let relevantTechniques = []
                        let group_ref = []
                        let technique_ref = []
                        let group_ref_to_description = {}
                        let refs = {}
                        window.mitre = mitre_attack
                        window.threat_groups = {}
                        $(".mitre_technique_displayElements.primary").each(function(num, obj){
                            relevantTechniques.push($(obj).text())
                        })
                        // console.log("Rolling forward with", relevantGroups, relevantTechniques)
                        for(let i = 0; i < mitre_attack.objects.length; i++){
                            if(mitre_attack.objects[i].type == "attack-pattern" ){
                                // console.log("Looking for ", mitre_attack.objects[i].name, "in", relevantTechniques, relevantTechniques.indexOf(mitre_attack.objects[i].name))
                            }
                            
                            if(mitre_attack.objects[i].type == "attack-pattern"  && relevantTechniques.indexOf(mitre_attack.objects[i].name) >= 0){
                                for(let g = 0; g < mitre_attack.objects[i].external_references.length; g++){
                                    if(mitre_attack.objects[i].external_references[g].external_id && mitre_attack.objects[i].external_references[g].url.indexOf("attack.mitre.org/")>=0){
                                        mitre_attack.objects[i].technique_id = mitre_attack.objects[i].external_references[g].external_id
                                    }
                                }
                                mitre_attack.objects[i].technique_name = mitre_attack.objects[i].name
                                technique_ref.push(mitre_attack.objects[i].id)
                                refs[mitre_attack.objects[i].id] = mitre_attack.objects[i]
                            }else if(mitre_attack.objects[i].type == "intrusion-set" && relevantGroups.indexOf(mitre_attack.objects[i].name) >= 0){
                                group_ref.push(mitre_attack.objects[i].id)
                                group_ref_to_description[mitre_attack.objects[i].id] = mitre_attack.objects[i].description
                                refs[mitre_attack.objects[i].id] = mitre_attack.objects[i]
                            }
                        }
                        
                        for(let i = 0; i < mitre_attack.objects.length; i++){
                            if(mitre_attack.objects[i].type == "relationship"){
                                if( group_ref.indexOf( mitre_attack.objects[i].source_ref ) >= 0 && technique_ref.indexOf( mitre_attack.objects[i].target_ref ) >= 0 ){
                                    if( ! window.threat_groups[ refs[mitre_attack.objects[i].source_ref].name ] ){
                                        window.threat_groups[ refs[mitre_attack.objects[i].source_ref].name ] = []
                                    }
                                    refs[mitre_attack.objects[i].target_ref].group_description = group_ref_to_description[mitre_attack.objects[i].source_ref]
                                    let relationshipObj = JSON.parse(JSON.stringify(refs[mitre_attack.objects[i].target_ref]))
                                    relationshipObj.relationship_notes = mitre_attack.objects[i]
                                    window.threat_groups[ refs[mitre_attack.objects[i].source_ref].name ].push(relationshipObj)
                                }
                                if( group_ref.indexOf( mitre_attack.objects[i].target_ref ) >= 0 && technique_ref.indexOf( mitre_attack.objects[i].source_ref ) >= 0 ){
                                    if( ! window.threat_groups[ refs[mitre_attack.objects[i].target_ref].name ] ){
                                        window.threat_groups[ refs[mitre_attack.objects[i].target_ref].name ] = []
                                    }
                                    refs[mitre_attack.objects[i].target_ref].group_description = group_ref_to_description[mitre_attack.objects[i].source_ref]
                                    let relationshipObj = JSON.parse(JSON.stringify(refs[mitre_attack.objects[i].source_ref]))
                                    relationshipObj.relationship_notes = mitre_attack.objects[i]
                                    window.threat_groups[ refs[mitre_attack.objects[i].target_ref].name ].push(relationshipObj)
                                }
                                refs[mitre_attack.objects[i].id] = mitre_attack.objects[i]
                            }
                        }
                        
                        function numberToWord(num){
                            let numbersToWords= ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty", "thirty-one", "thirty-two", "thirty-three", "thirty-four", "thirty-five", "thirty-six", "thirty-seven", "thirty-eight", "thirty-nine", "forty", "forty-one", "forty-two", "forty-three", "forty-four", "forty-five", "forty-six", "forty-seven", "forty-eight", "forty-nine", "fifty", "fifty-one", "fifty-two", "fifty-three", "fifty-four", "fifty-five", "fifty-six", "fifty-seven", "fifty-eight", "fifty-nine", "sixty", "sixty-one", "sixty-two", "sixty-three", "sixty-four", "sixty-five", "sixty-six", "sixty-seven", "sixty-eight", "sixty-nine", "seventy", "seventy-one", "seventy-two", "seventy-three", "seventy-four", "seventy-five", "seventy-six", "seventy-seven", "seventy-eight", "seventy-nine", "eighty", "eighty-one", "eighty-two", "eighty-three", "eighty-four", "eighty-five", "eighty-six", "eighty-seven", "eighty-eight", "eighty-nine", "ninety", "ninety-one", "ninety-two", "ninety-three", "ninety-four", "ninety-five", "ninety-six", "ninety-seven", "ninety-eight", "ninety-nine", "one hundred"]
                            let str = numbersToWords[num]
                            str = str.charAt(0).toUpperCase() + str.slice(1);
                            return str
                        }
                        
                        // console.log("In the Modal", groupName)
                        // Now we initialize the Modal itself
                        var myModal = new Modal("threatGroups", {
                            title: Splunk.util.sprintf(_("Threat Group: %s").t(), groupName),
                            backdrop: 'static',
                            keyboard: true,
                            destroyOnHide: true
                        });
                        myModal.$el.addClass("modal-extra-wide")
                        let myBody = $("<div>")
                        if(! window.threat_groups[groupName]){
                            myBody.html("<p>Application Error -- " + groupName + " not found.</p>")
                        }else{
                            if(window.threat_groups[groupName][0]['group_description']){
                                myBody.append("<h4>" + _("Description").t() + "</h4>")
                                let description;
                                try{
                                    description = window.threat_groups[groupName][0]['group_description'].replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
                                }catch(error){
                                    description = window.threat_groups[groupName][0]['group_description']
                                }
                                myBody.append($("<p style=\"white-space: pre-line\">").text(description))
                            }
                            myBody.append("<h4>" + _("Links").t() + "</h4>")
                            myBody.append($("<p>").append( $('<a target="_blank" class="external drilldown-icon">').text(_("MITRE ATT&CK Site").t()).attr("href", "https://attack.mitre.org/groups/" + window.threat_groups[groupName][0]['group_id']) ))
                            myBody.append($("<p>").append( $('<a target="_blank" class="external drilldown-icon">').text(_("Splunk Security Essentials Content").t()).attr("href", "contents#mitre_threat_groups=" + encodeURIComponent(window.threat_groups[groupName][0]['group_name'])) ))
                            myBody.append("<h4>" + _("Techniques").t() + "</h4>")
                            if(window.threat_groups[groupName].length>1){
                                myBody.append("<p>" + Splunk.util.sprintf(_("%s techniques used by %s For %s").t(), numberToWord(window.threat_groups[groupName].length), groupName, window.summary.name) + "</p>")
                            }else{
                                myBody.append("<p>" + Splunk.util.sprintf(_("%s technique used by %s For %s").t(), numberToWord(window.threat_groups[groupName].length), groupName, window.summary.name) + "</p>")
                            }
                            

                            for(let i = 0; i < window.threat_groups[groupName].length; i++){
                                if(i > 0){
                                    myBody.append("<hr/>")
                                }
                                myBody.append($("<h4>").append($('<a href="#" click="return false;" style="color: black"><i  class="icon-chevron-right" /> ' + window.threat_groups[groupName][i]['technique_id'] + ": " + window.threat_groups[groupName][i]['technique_name'] + '</a>').attr("data-id", window.threat_groups[groupName][i]['technique_id']).click(function(evt){
                                    let id = $(evt.target).closest("h4").find("a").attr("data-id");
                                    let descriptionObj = $("#" + id + "_description");
                                    let myObj = $(evt.target).closest("h4").find("i")
                                    let currentStatus = myObj.attr("class")
                                    if(currentStatus == "icon-chevron-down"){
                                        myObj.attr("class", "icon-chevron-right")
                                        descriptionObj.css("display", "none")
                                    }else{
                                        myObj.attr("class", "icon-chevron-down")
                                        descriptionObj.css("display", "block")
                                    }
                                    return false;
                                }) ))

                                let description;
                                try{
                                    description = window.threat_groups[groupName][i]['description'].replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
                                }catch(error){
                                    description = window.threat_groups[groupName][i]['description']
                                }
                                
                                myBody.append($("<p id=\"" + window.threat_groups[groupName][i]['technique_id'] + "_description\" style=\"display: none; white-space: pre-line\">").text(description))
                                myBody.append($("<p>").text(_("MITRE ATT&CK Summary: ").t() + window.threat_groups[groupName][i]['relationship_notes']['description'].replace(/\[([^\]]*)\]\(.*?\)/g, "$1")))
                                if(window.threat_groups[groupName][i]['relationship_notes']['external_references'].length>0){
                                    let shouldAppend = false;
                                    let myTable = $('<table class="table"><thead><tr><th>Source Name</th><th>Description</th><th>Link</th></tr></thead><tbody></tbody></table>')
                                    for(let g = 0; g < window.threat_groups[groupName][i]['relationship_notes']['external_references'].length; g++){
                                        if(! window.threat_groups[groupName][i]['relationship_notes']['external_references'][g]['description'] || window.threat_groups[groupName][i]['relationship_notes']['external_references'][g]['description'] == ""){
                                            continue;
                                        }
                                        shouldAppend = true;
                                        let description;
                                        try{
                                            description = window.threat_groups[groupName][i]['relationship_notes']['external_references'][g]['description'].replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
                                        }catch(error){
                                            description = window.threat_groups[groupName][i]['relationship_notes']['external_references'][g]['description']
                                        }
                                        myTable.find("tbody").append($("<tr>").append(
                                            $("<td>").text(window.threat_groups[groupName][i]['relationship_notes']['external_references'][g]['source_name']),
                                            $("<td style=\"white-space: pre-line\">").text(description), // (window.threat_groups[groupName][i]['external_references'][g]['description']),
                                            $("<td>").html($('<a target="_blank" class="external drilldown-icon"></a>').attr("href", window.threat_groups[groupName][i]['relationship_notes']['external_references'][g]['url']))
                                        ))
                                    }
                                    if(shouldAppend){
                                        myBody.append(myTable)
                                    }
                                }
                            }
                            
                        }
                        myModal.body.append(myBody)

                        myModal.footer.append($('<button>').attr({
                            type: 'button',
                            'data-dismiss': 'modal'
                        }).addClass('btn btn-primary').text( _('Close').t() ).on('click', function() {
                            // Not taking any action here
                        }))
                        myModal.show(); // Launch it!
                    })
            }
            window.showGroup = showGroup




            var mitreThreatGroupText = ""
    
            if (typeof summary.mitre_threat_groups != "undefined" && summary.mitre_threat_groups != "") {
                let mitre = summary.mitre_threat_groups.split("|")
                if (mitre.indexOf("None") >= 0) {
                    mitre = mitre.splice(mitre.indexOf("None"), 1);
                }
                if (mitre.length > 0 && mitreThreatGroupText == "") {
                    mitreThreatGroupText = "<h2 style=\"margin-bottom: 5px;\">" + _("MITRE Threat Groups").t()  + " (" + _("Click for Detail").t() + ")</h2>"// + " <a href=\"https://attack.mitre.org/groups/\" class=\"external drilldown-icon\" target=\"_blank\"></a></h2>"
                }
                let numAdded = 0;
                for (var i = 0; i < mitre.length; i++) {
                    if (mitre[i] == "None") {
                        continue;
                    }
                    numAdded++;
                    mitreThreatGroupText += "<div class=\"mitre_threat_groupsElements\" onclick=\"showGroup('" + mitre[i] + "')\">" + mitre[i] + "</div>"
                }
                mitreThreatGroupText += "<br style=\"clear: both;\"/>"
                if (numAdded == 0) {
                    mitreThreatGroupText = ""
                }
            }
            // if (typeof summary.mitre_technique_group_json != "undefined" && summary.mitre_technique_group_json != "") {
            //     try{
            //         let groups = JSON.parse(summary.mitre_technique_group_json)
            //         let group_names = Object.keys(groups);
            //         group_names.sort()
            //         window.threat_groups = groups;
            //         if (group_names.length > 0) {
            //             mitreThreatGroupText = "<h2 style=\"margin-bottom: 5px;\">" + _("MITRE Threat Groups").t() + " (Click for Detail)</h2>"
            //         }
            //         for(let i = 0; i < group_names.length; i++){
                        
            //             mitreThreatGroupText += "<div class=\"mitre_threat_groupsElements\" onclick=\"showGroup('" + group_names[i] + "')\">" + group_names[i] + "</div>"
            //         }

            //         mitreThreatGroupText += "<br style=\"clear: both;\"/>"
            //         console.log("Hey! Got groups", groups)
            //     }catch(error){
            //         console.log("Error parsing groups", error)
                    
            //     }
            // }
            // if (typeof summary.mitre_threat_groups != "undefined" && summary.mitre_threat_groups != "") {
            //     let mitre = summary.mitre_threat_groups.split("|")
            //     if (mitre.indexOf("None") >= 0) {
            //         mitre = mitre.splice(mitre.indexOf("None"), 1);
            //     }
            //     if (mitre.length > 0 && mitreThreatGroupText == "") {
            //         mitreThreatGroupText = "<h2 style=\"margin-bottom: 5px;\">" + _("MITRE Threat Groups").t() + " <a href=\"https://attack.mitre.org/groups/\" class=\"external drilldown-icon\" target=\"_blank\"></a></h2>"
            //     }
            //     let numAdded = 0;
            //     for (var i = 0; i < mitre.length; i++) {
            //         if (mitre[i] == "None") {
            //             continue;
            //         }
            //         numAdded++;
            //         mitreThreatGroupText += "<div class=\"mitre_threat_groupsElements\">" + mitre[i] + "</div>"
            //     }
            //     mitreThreatGroupText += "<br style=\"clear: both;\"/>"
            //     if (numAdded == 0) {
            //         mitreThreatGroupText = ""
            //     }
            // }

            var killchainText = ""
            if (typeof summary.killchain != "undefined" && summary.killchain != "") {
                let killchain = summary.killchain.split("|")
                if (killchain.length > 0 && killchainText == "") {
                    killchainText = "<h2 style=\"margin-bottom: 5px;\">" + _("Kill Chain Phases").t() + " <a href=\"https://www.lockheedmartin.com/us/what-we-do/aerospace-defense/cyber/cyber-kill-chain.html\" class=\"external drilldown-icon\" target=\"_blank\"></a></h2>"
                }
                let numAdded = 0;
                for (var i = 0; i < killchain.length; i++) {
                    if (killchain[i] == "None") {
                        continue;
                    }
                    numAdded++;
                    killchainText += "<div class=\"killchain\">" + killchain[i] + "</div>"
                }
                killchainText += "<br style=\"clear: both;\"/>"
                if (numAdded == 0) {
                    killchainText = ""
                }
            }

            var cisText = ""
            if (typeof summary.cis != "undefined") {
                cis = summary.cis.split("|")
                for (var i = 0; i < cis.length; i++) {
                    cisText += "<div class=\"cis\">" + cis[i] + "</div>"
                }
                cisText += "<br/><br/>"
            }

            var technologyText = ""
            if (typeof summary.technology != "undefined") {
                technology = summary.technology.split("|")
                for (var i = 0; i < technology.length; i++) {
                    technologyText += "<div class=\"technology\">" + technology[i] + "</div>"
                }
                technologyText += "<br/><br/>"
            }
            var YouTubeText = ""
            if (typeof summary.youtube != "undefined") {
                YouTubeText = Template.replace(/SHORTNAME/g, "youtube").replace("TITLE", "Search Explanation - Video")
                YouTubeText += '<div class="auto-resizable-iframe"><div><iframe src="' + summary.youtube + '" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
                YouTubeText += "</div></div><br/><br/></td></tr></table>"
            }

            var box1 = '<div style="overflow: hidden; padding: 10px; margin: 0px; width: 50%; min-width:585px; min-height: 250px; display: table-cell; border: 1px solid darkgray;">' + usecaseText + areaText + relevance + alertVolumeText + SPLEaseText + '</div>'
            var box2 = '<div style="overflow: hidden; padding: 10px; margin: 0px; width: 49%; min-width:305px; min-height: 250px; display: table-cell; border: 1px solid darkgray; border-left: 0">' + BookmarkStatus + DataAvailabilityStatus + Stage + mitreText + mitreTechniqueText + mitreThreatGroupText + killchainText + cisText + technologyText + datasourceText + '</div>'
            description = panelStart + descriptionText + companyTextBanner + '<br/><div style=" display: table;">' + box1 + box2 + '</div>' + panelEnd
            var descriptiontwo = panelStart + partnerText + companyTextDescription + gdprText + otherSplunkCapabilitiesText + phantomText + howToImplementText + eli5Text + YouTubeText + knownFPText + operationalizeText + supportingImagesText + showSPLText + per_instance_help + additionalContextText + searchStringText + panelEnd
            //description = panelStart + descriptionText + '<br/><div style=" display: table;">' + box1 + box2 + '</div><br/>' + gdprText + otherSplunkCapabilitiesText + phantomText + howToImplementText + eli5Text + YouTubeText + knownFPText + operationalizeText + supportingImagesText + showSPLText + per_instance_help + searchStringText + panelEnd


            // Helper Functions
            function data_available_modal(obj) {

                require(['jquery', 'components/controls/Modal',
                    'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes',
                    'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=data_inventory&locale=' + window.localeString
                ], function($, Modal, data_inventory_eventtypes, data_inventory) {
                    let myModal = new Modal('data_sources', {
                        title: 'Dependent Data Sources',
                        destroyOnHide: true
                    });
                    if (!window.ShowcaseInfo) {
                        $.ajax({ url: $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString, async: false, success: function(returneddata) { window.ShowcaseInfo = returneddata } });
                    }
                    
                    let body = $("<div>");
                    let container = $(obj).closest(".contentDescription");
                    let showcaseId = container.attr("data-showcaseid")
                    let summary = window.ShowcaseInfo['summaries'][showcaseId]
                    let dscs = summary.data_source_categories.split("|");
                    // console.log("blah blah", summary, dscs)

                    body.append($("<p>").html(_('The data availability metric is driven by the configuration on the <a href="data_inventory" target="_blank" class="drilldown-link">Data Inventory</a> dashboard.').t()))

                    if (dscs.length > 1) {

                        body.append($("<p>").html(_('There are multiple potential data source categories for this example. The aggregate score is taken by averaging all of the following.').t()))

                    }

                    let table = $('<table class="table"><thead><tr><th>' + _("Data Source Category").t() + '</th><th>' + _("Status").t() + '</th><th>Open</th></tr></thead><tbody></tbody></table>')

                    for (let i = 0; i < dscs.length; i++) {
                        let status = "?"
                        for (let g = 0; g < data_inventory_eventtypes.length; g++) {

                            if (data_inventory_eventtypes[g]['eventtypeId'] == dscs[i]) {
                                if( data_inventory_eventtypes[g]['coverage_level'] && data_inventory_eventtypes[g]['coverage_level'] !="" && parseInt(data_inventory_eventtypes[g]['coverage_level']) >=0){
                                    status = data_inventory_eventtypes[g]['coverage_level'] + "%"    
                                }else if(data_inventory_eventtypes[g]['status'] && data_inventory_eventtypes[g]['status'] =="failure"){
                                    status = "None"    
                                }else{
                                    status = "Complete"
                                }
                                
                            }
                        }
                        let name = ""
                        for (let ds in data_inventory) {
                            for (let dsc in data_inventory[ds]['eventtypes']) {
                                if (dsc == dscs[i]) {
                                    name = data_inventory[ds]['eventtypes'][dsc]['name'];
                                }
                            }
                        }
                        table.find("tbody").append($("<tr><td>" + name + "</td><td>" + status + '</td><td><a href="data_inventory#id=' + dscs[i] + '" target="_blank" class="external drilldown-link"></a></td></tr>'))
                    }
                    body.append(table)

                    myModal.body.html(body)

                    myModal.footer.append($('<button>').attr({
                        type: 'button',
                        'data-dismiss': 'modal'
                    }).addClass('btn btn-primary').text('Close').on('click', function() {
                        // Not taking any action on Close
                    }))
                    myModal.show()
                })

            }
            window.data_available_modal = data_available_modal


            window.popBookmarkOptions = function(obj) {
                let showcaseId = $(obj).closest(".contentDescription").attr("data-showcaseid")
                var boxHTML = $('<div id="box-' + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "") + '" style="background-color: white; border: 1px gray solid; position: absolute; padding: 7px; left: 190px; top: 0px; width: 210px; height: 260px;"></div>').append('<i class="icon-close" onclick="$(this).parent().remove()" style="float: right;"></i>', "<h5 style=\"padding-top: 0px;padding-bottom: 5px; margin-top: 0px;\">Change Status</h5>")
                var unmarkBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><img src="' + Splunk.util.make_full_url('/static/app/Splunk_Security_Essentials/images/general_images/nobookmark.png') + '" style="height: 18px" /></span> <a href="#" onclick="return false;">' + _("Clear Bookmark").t() + '</a></p>')
                unmarkBox.click(function() {
                    setbookmark_status(name, showcaseId, "none")
                    $(obj).text("Not On List")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                var bookmarkedBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><i style="font-size: 24px;" class="icon-bookmark"></i></span> <a href="#" onclick="return false;">' + _("Bookmarked (no status)").t() + '</a></p>')
                bookmarkedBox.click(function() {
                    setbookmark_status(name, showcaseId, "bookmarked")
                    $(obj).text("Bookmarked")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                var needDataBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><i style="font-size: 20px;" class="icon-circle"></i></span> <a href="#" onclick="return false;">' + _("Waiting On Data").t() + '</a></p>')
                needDataBox.click(function() {
                    setbookmark_status(name, showcaseId, "needData")
                    $(obj).text("Waiting On Data")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                var inQueueBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><i style="font-size: 20px;" class="icon-calendar"></i></span> <a href="#" onclick="return false;">' + _("Ready for Deployment").t() + '</a></p>')
                inQueueBox.click(function() {
                    setbookmark_status(name, showcaseId, "inQueue")
                    $(obj).text("Ready for Deployment")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                var issuesDeployingBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><i style="font-size: 20px;" class="icon-alert-circle"></i></span> <a href="#" onclick="return false;">' + _("Deployment Issues").t() + '</a></p>')
                issuesDeployingBox.click(function() {
                    setbookmark_status(name, showcaseId, "issuesDeploying")
                    $(obj).text("Deployment Issues")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                var needTuningBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><i style="font-size: 20px;" class="icon-gear"></i></span> <a href="#" onclick="return false;">' + _("Needs Tuning").t() + '</a></p>')
                needTuningBox.click(function() {
                    setbookmark_status(name, showcaseId, "needsTuning")
                    $(obj).text("Needs Tuning")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                var successfullyImplementedBox = $('<p class="bookmarkStatus" style="cursor: pointer"><span style="display: inline-block; text-align: center; width: 18px;"><i style="font-size: 20px;" class="icon-check"></i></span> <a href="#" onclick="return false;">' + _("Successfully Implemented").t() + '</a></div>')
                successfullyImplementedBox.click(function() {
                    setbookmark_status(name, showcaseId, "successfullyImplemented")
                    $(obj).text("Successfully Implemented")
                    setTimeout(function() { $("#box-" + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove() }, 1000)
                })
                boxHTML.append(unmarkBox, bookmarkedBox, needDataBox, inQueueBox, issuesDeployingBox, needTuningBox, successfullyImplementedBox)
                var pos = $(obj).offset()
                var leftPos = pos.left + 10
                var topPos = pos.top + 20
                if (leftPos + 200 > $(window).width()) {
                    leftPos = leftPos - 195;
                    topPos = topPos + 20;
                }

                $(document).keyup(function(e) {

                    if (e.keyCode === 27)
                        if (document.getElementById('box-' + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")) != null) {
                            $('#box-' + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).remove()
                        }

                });
                $(document).mouseup(function(e) {
                    var container = $('#box-' + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, ""))

                    // if the target of the click isn't the container nor a descendant of the container
                    if (!container.is(e.target) && container.has(e.target).length === 0) {
                        container.remove();
                    }
                });
                $("body").append(boxHTML)
                $("#" + 'box-' + name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")).css({ top: topPos, left: leftPos })

            }
            return [description, descriptiontwo];
        },
        process_chosen_summary: function process_chosen_summary(summary, sampleSearch, ShowcaseInfo, showcaseName) {

            let translatedLabels = {}
            try{
                if(localStorage['Splunk_Security_Essentials-i18n-labels-' + window.localeString] != undefined){
                    translatedLabels = JSON.parse(localStorage['Splunk_Security_Essentials-i18n-labels-' + window.localeString])
                }
            }catch(error){}


            //console.log("ShowcaseInfo: Got it!", summary, sampleSearch, showcaseName)
            if (typeof sampleSearch.label != "undefined" && sampleSearch.label.indexOf(" - Demo") > 0) {
                var unsubmittedTokens = splunkjs.mvc.Components.getInstance('default');
                var submittedTokens = splunkjs.mvc.Components.getInstance('submitted');
                unsubmittedTokens.set("demodata", "blank");
                submittedTokens.set(unsubmittedTokens.toJSON());
            }

            var DoImageSubtitles = function(numLoops) {
                if (typeof numLoops == "undefined")
                    numLoops = 1
                var doAnotherLoop = false
                    //console.log("Starting the Subtitle..")
                $(".screenshot").each(function(count, img) {
                    //console.log("got a subtitle", img)

                    if (typeof $(img).css("width") != "undefined" && parseInt($(img).css("width").replace("px")) > 10 && typeof $(img).attr("processed") == "undefined") {
                        var width = "width: " + $(img).css("width")

                        var myTitle = ""
                        if (typeof $(img).attr("title") != "undefined" && $(img).attr("title") != "") {
                            myTitle = "<p style=\"color: gray; display: inline-block; clear:both;" + width + "\"><center><i>" + $(img).attr("title") + "</i></center>"

                        }
                        $(img).attr("processed", "true")
                        if (typeof $(img).attr("zoomin") != "undefined" && $(img).attr("zoomin") != "") {
                            // console.log("Handling subtitle zoom...", width, $(img).attr("zoomin"), $(img).attr("setWidth"), (typeof $(img).attr("zoomin") != "undefined" && $(img).attr("zoomin") != ""))
                            if (typeof $(img).attr("setwidth") != "undefined" && parseInt($(img).css("width").replace("px")) > parseInt($(img).attr("setwidth"))) {
                                width = "width: " + $(img).attr("setwidth") + "px"
                            }
                            $(img).replaceWith("<div style=\"display: inline-block; margin:10px; border: 1px solid lightgray;" + width + "\"><a href=\"" + $(img).attr("src") + "\" target=\"_blank\">" + img.outerHTML + "</a>" + myTitle + "</div>")
                        } else {
                            ($(img)).replaceWith("<div style=\"display: block; margin:10px; border: 1px solid lightgray;" + width + "\">" + img.outerHTML + myTitle + "</div>")
                        }

                    } else {
                        doAnotherLoop = true
                            //console.log("Analyzing image: ", $(img).css("width"), $(img).attr("processed"), $(img))
                    }
                })
                if (doAnotherLoop && numLoops < 30) {
                    numLoops++;
                    setTimeout(function() { DoImageSubtitles(numLoops) }, 500)
                }
            }
            window.DoImageSubtitles = DoImageSubtitles
            require(['json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(appConfig) {
                let telemetryObj = { "status": "exampleLoaded", "exampleName": summary.name, "searchName": sampleSearch.label }
                for(let i = 0; i < appConfig.length; i++){
                    if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                        telemetryObj.demoMode = true
                    }
                }
                Telemetry.SendTelemetryToSplunk("PageStatus", telemetryObj)
            })


            $("#row1").hide() // Hide the basic search link
            $(".hide-global-filters").hide() // Hide the "Hide Filters" link

            if (typeof $(".dashboard-header-title")[0] != "undefined") {
                $(".dashboard-header-description").html("Assistant: " + $(".dashboard-header-title").first().html())
                $(".dashboard-header-title").html("<a href=\"contents\">" + _("Security Content").t() + "</a> / " + summary.name)

            } else {
                //$(".dashboard-header-description").html("Assistant: " + $(".dashboard-header-title").first().html() )  
                $(".dashboard-header h2").first().html(summary.name + " (Assistant: " + $(".dashboard-header h2").first().html() + ")")
            }
            //console.log("ShowcaseInfo: Original Title", document.title)
            document.title = summary.name + document.title.substr(document.title.indexOf("|") - 1)
            var exampleText = ""
            var exampleList = $('<span></span>')
                //console.log("ShowcaseInfo: New Title", document.title)
            if (typeof summary.examples != "undefined") {
                exampleText = $('<div id="exampleList" style="float: right"> ' + _("View").t() + '&nbsp;&nbsp;</div>')
                    //exampleText = '<div id="searchList" style="float: right; border: solid lightgray 1px; padding: 5px;"><a name="searchListAnchor" />' 
                    //exampleText += summary.examples.length > 1 ? '<h2 style="padding-top: 0;">Searches:</h2>' : '<h2 style="padding-top: 0;">Search:</h2>';
                    //exampleList = $('<ul class="example-list"></ul>');

                summary.examples.forEach(function(example) {
                    var showcaseURLDefault = summary.dashboard;
                    if (summary.dashboard.indexOf("?") > 0) {
                        showcaseURLDefault = summary.dashboard.substr(0, summary.dashboard.indexOf("?"))
                    }

                    var url = showcaseURLDefault + '?ml_toolkit.dataset=' + example.name;
                    let label = example.label
                    if(translatedLabels[label] && translatedLabels[label] != undefined && translatedLabels[label] != ""){
                        label = translatedLabels[label] 
                    }
                    if (example.name == sampleSearch.label) {
                        exampleText.append($("<button></button>").attr("data-label", label).addClass("selectedButton").text(label))
                    } else {
                        exampleText.append($("<button></button>").attr("data-label", label).text(label).click(function() { window.location.href = url }))
                    }
                });
                //exampleText += "<ul>" + exampleList.html() + "</ul></div>"
                exampleText.find("button").first().addClass("first")
                exampleText.find("button").last().addClass("last")
                    //("Got my Example Text...", exampleText)
                if (summary.examples.length > 1) {
                    var content = "<span>" + _("Demo Data").t() + "</span> You're looking at the <i>" + sampleSearch.label.replace(/^.*\- /, "") + "</i> search right now. Did you know that we have " + summary.examples.length + " searches for this example? <a style=\"color: white; font-weight: bold; text-decoration: underline\" href=\"#\" onclick=\"var jElement = $('#exampleList'); $('html, body').animate({ scrollTop: jElement.offset().top-30}); $('body').append('<div class=\\'modal-backdrop  in\\'></div>');  jElement.addClass('searchListHighlight');setTimeout(function(){ $('.modal-backdrop').remove(); jElement.removeClass('searchListHighlight'); },2000);return false;\">Scroll Up</a> to the top to see the other searches."

                    setTimeout(function() {
                        $("#searchLabelMessage").html(content)
                            //console.log("Setting the reference content to ", content)

                    }, 1000)
                }


            }
            if (typeof summary.hideSearches != "undefined" && summary.hideSearches == true) {
                showSPLText = "" // Hide the search accordian
                $("#fieldset1").hide() // hide  the search bar
                $("#row11").hide() // Prereq 
                for (var i = 2; i <= 10; i++) { //all of the dashboard panel 
                    $("#row" + i).hide()
                }
            }

            let name = summary.name;
            window.setbookmark_status = function(name, showcaseId, status, action) {
                if (!action) {
                    action = splunkjs.mvc.Components.getInstance("env").toJSON()['page']
                }


                
                require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
                    let record = { "status": status, "name": name, "selectionType": action }
                    for(let i = 0; i < appConfig.length; i++){
                        if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                             record.demoMode = true
                        }
                    }
                    Telemetry.SendTelemetryToSplunk("BookmarkChange", record)
                })

                require(["splunkjs/mvc/utils", "splunkjs/mvc/searchmanager"], function(utils, SearchManager) {
                    new SearchManager({
                        "id": "logBookmarkChange-" + name.replace(/[^a-zA-Z0-9]/g, "_"),
                        "latest_time": "0",
                        "autostart": true,
                        "earliest_time": "now",
                        "search": '| makeresults | eval app="' + utils.getCurrentApp() + '", page="' + splunkjs.mvc.Components.getInstance("env").toJSON()['page'] + '", user="' + $C['USERNAME'] + '", name="' + name + '", status="' + status + '" | collect index=_internal sourcetype=essentials:bookmark',
                        "app": utils.getCurrentApp(),
                        "auto_cancel": 90
                    }, { tokens: false });
                })
                var record = { _time: (new Date).getTime() / 1000, _key: showcaseId, showcase_name: name, status: status, user: Splunk.util.getConfigValue("USERNAME") }

                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/?query={"_key": "' + record['_key'] + '"}',
                    type: 'GET',
                    contentType: "application/json",
                    async: false,
                    success: function(returneddata) {
                        if (returneddata.length == 0) {
                            // New

                            $.ajax({
                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/',
                                type: 'POST',
                                contentType: "application/json",
                                async: false,
                                data: JSON.stringify(record),
                                success: function(returneddata) {bustCache(); newkey = returneddata },
                                error: function(xhr, textStatus, error) {

                                }
                            })


                        } else {
                            // Old
                            $.ajax({
                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/' + record['_key'],
                                type: 'POST',
                                contentType: "application/json",
                                async: false,
                                data: JSON.stringify(record),
                                success: function(returneddata) {bustCache(); newkey = returneddata },
                                error: function(xhr, textStatus, error) {
                                    //              console.log("Error Updating!", xhr, textStatus, error)
                                }
                            })
                        }
                    },
                    error: function(error, data, other) {
                        //     console.log("Error Code!", error, data, other)
                    }
                })
            }


            let summaryUI = this.GenerateShowcaseHTMLBody(summary, ShowcaseInfo);
            //let description = summaryUI[0] + summaryUI[1]
            if (typeof $(".dashboard-header-description")[0] != "undefined") {
                $(".dashboard-header-description").parent().append($("<br/>" + summaryUI[0]))
            } else {
                $(".dashboard-header .description").first().html(summaryUI[0])
            }
            // window.dvtest = summaryUI[1]
            // console.log("Looking to add..", $("#fieldset1").length, $("#layout1").length, summaryUI[1] )
            if($("#fieldset1").length > 0){
                $(summaryUI[1]).insertAfter("#fieldset1")
            }else if($("#layout1").length > 0){
                $(summaryUI[1]).insertAfter("#layout1")
            }else{
                $(".dashboard-body").append(summaryUI[1])
            }
            
            //$("#fieldset1").insertAfter($(summaryUI[1]))
            $("#alertVolumetooltip").popover()
            $("[data-toggle=tooltip]").tooltip()
            $("#contentDescription").prepend('<div id="Tour" style="float: right" class="tour"><a class="external drilldown-link" style="color: white;" href="' + window.location.href + "&tour=" + showcaseName + "-tour" + '">' + _("Learn how to use this page").t() + '</a></div>')
            $("#contentDescription").prepend(exampleText)

            $("#fullSolution_table th.expands").find("a").click(function() { $(".contentstile").find("h3").each(function(a, b) { if ($(b).height() > 60) { $(b).text($(b).text().replace(/^(.{55}).*/, "$1...")) } }) })
            if (typeof summary.autoOpen != "undefined") {
                $("#" + summary.autoOpen + " th.expands").find("a").trigger("click")
            }
            if ($("#gdprtext_table").length > 0) {
                $("#gdprtext_table th.expands").find("a").trigger("click")
            }
            var visualizations = [];

            if (typeof summary.visualizations != "undefined") {
                visualizations = summary.visualizations

            }

            if (typeof sampleSearch.visualizations != "undefined" && sampleSearch.visualizations.length > 0) {
                for (var i = 0; i < sampleSearch.visualizations.length; i++) {
                    if (typeof sampleSearch.visualizations[i].panel != "undefined") {
                        var shouldAppend = true;
                        for (var g = 0; g < visualizations.length; g++) {
                            if (sampleSearch.visualizations[i].panel == visualizations[g].panel) {
                                shouldAppend = false;
                                visualizations[g] = sampleSearch.visualizations[i];
                            }
                        }
                        if (shouldAppend) {
                            visualizations.push(sampleSearch.visualizations[i])
                        }
                    }
                }

            }
            //      console.log("Visualization Status", visualizations, sampleSearch, summary)
            if (visualizations.length > 0) {
                var triggerSubtitles = false
                for (var i = 0; i < visualizations.length; i++) {
                    // console.log("Analyzing panle", visualizations[i])
                    if (typeof visualizations[i].panel != "undefined" && typeof visualizations[i].type != "undefined" && (typeof visualizations[i].hideInSearchBuilder == "undefined" || visualizations[i].hideInSearchBuilder == false)) {
                        if (visualizations[i].type == "HTML" && typeof visualizations[i].html != "undefined") {
                            // console.log("Enabling panle", visualizations[i].panel)
                            var unsubmittedTokens = splunkjs.mvc.Components.getInstance('default');
                            var submittedTokens = splunkjs.mvc.Components.getInstance('submitted');
                            unsubmittedTokens.set(visualizations[i].panel, "blank");
                            submittedTokens.set(unsubmittedTokens.toJSON());

                            $("#" + visualizations[i].panel).html(visualizations[i].html)
                        } else if (visualizations[i].type == "image" && typeof visualizations[i].path != "undefined") {
                            // console.log("Enabling panle", visualizations[i].panel)
                            var unsubmittedTokens = splunkjs.mvc.Components.getInstance('default');
                            var submittedTokens = splunkjs.mvc.Components.getInstance('submitted');
                            unsubmittedTokens.set(visualizations[i].panel, "blank");
                            submittedTokens.set(unsubmittedTokens.toJSON());
                            var style = ""
                            if (typeof visualizations[i].style != "undefined")
                                style = "style=\"" + visualizations[i].style + "\""
                            var title = ""
                            if (typeof visualizations[i].title != "undefined")
                                title = "title=\"" + visualizations[i].title + "\""
                                // console.log("Her'es my panle title", title)
                            $("#" + visualizations[i].panel).html("<img class=\"screenshot\" " + style + " src=\"" + visualizations[i].path + "\" " + title + " />")
                            triggerSubtitles = true
                        } else if (visualizations[i].type == "viz") {
                            // console.log("Enabling panle", visualizations[i].panel)
                            var unsubmittedTokens = splunkjs.mvc.Components.getInstance('default');
                            var submittedTokens = splunkjs.mvc.Components.getInstance('submitted');
                            unsubmittedTokens.set(visualizations[i].panel, "blank");
                            submittedTokens.set(unsubmittedTokens.toJSON());
                            $("#" + visualizations[i].panel).html("<div id=\"element" + visualizations[i].panel + "\" />")
                            var SMConfig = {
                                "status_buckets": 0,
                                "cancelOnUnload": true,
                                "sample_ratio": null,
                                "app": "Splunk_Security_Essentials",
                                "auto_cancel": 90,
                                "preview": true,
                                "tokenDependencies": {},
                                "runWhenTimeIsUndefined": false
                            }
                            SMConfig.id = "search" + visualizations[i].panel
                            if (typeof visualizations[i].basesearch == "undefined") {
                                //              console.log("No Base Search Detected", visualizations[i])
                                SMConfig.search = visualizations[i].search
                            } else {
                                //              console.log("Woo! Base Search Detected", visualizations[i])
                                if (visualizations[i].search.match(/^\s*\|/)) {
                                    SMConfig.search = visualizations[i].basesearch + " " + visualizations[i].search
                                } else {
                                    SMConfig.search = visualizations[i].basesearch + "| " + visualizations[i].search
                                }
                            }

                            /*new SearchManager({
                                "id": "search8",
                                "latest_time": "now",
                                "status_buckets": 0,
                                "cancelOnUnload": true,
                                "earliest_time": "-24h@h",
                                "sample_ratio": null,
                                "search": "| makeresults count=15 | streamstats count",
                                "app": utils.getCurrentApp(),
                                "auto_cancel": 90,
                                "preview": true,
                                "tokenDependencies": {
                                },
                                "runWhenTimeIsUndefined": false
                            }, {tokens: true, tokenNamespace: "submitted"});*/
                            var VizConfig = visualizations[i].vizParameters
                            VizConfig.id = "element" + visualizations[i].panel
                            VizConfig.managerid = "search" + visualizations[i].panel
                            VizConfig.el = $("#element" + visualizations[i].panel)

                            // console.log("Got our panle SM Config", SMConfig)
                            // console.log("Got our panle Viz Config", VizConfig)
                            /*{
                                "id": "element2",
                                "charting.drilldown": "none",
                                "resizable": true,
                                "charting.chart": "area",
                                "managerid": "search2",
                                "el": $('#element2')
                            }*/
                            var SM = new SearchManager(SMConfig, { tokens: true, tokenNamespace: "submitted" });
                            // console.log("Got our panle SM", SM)
                            var Viz;
                            if (visualizations[i].vizType == "ChartElement") {
                                Viz = new ChartElement(VizConfig, { tokens: true, tokenNamespace: "submitted" }).render();
                            } else if (visualizations[i].vizType == "SingleElement") {
                                Viz = new SingleElement(VizConfig, { tokens: true, tokenNamespace: "submitted" }).render();
                            } else if (visualizations[i].vizType == "MapElement") {
                                Viz = new MapElement(VizConfig, { tokens: true, tokenNamespace: "submitted" }).render();
                            } else if (visualizations[i].vizType == "TableElement") {
                                Viz = new TableElement(VizConfig, { tokens: true, tokenNamespace: "submitted" }).render();
                            }
                            // console.log("Got our panle Viz", Viz)

                            SM.on("search:done", function(properties) {
                                //             console.log("search complete", properties.content.label)
                                var panelName = properties.content.label.replace(/search/, "")

                                // Instantiate the results link view
                                var resultsLink = new ResultsLinkView({
                                    id: "search" + panelName + "-resultsLink",
                                    managerid: "search" + panelName //,
                                        //el: $("#row1cell1").find(".panel-body")
                                });

                                // Display the results link view
                                resultsLink.render().$el.appendTo($("#" + panelName).find(".panel-body"));
                                $("#search" + panelName + "-resultsLink").addClass("resultLink")

                            })

                        }
                        if (typeof visualizations[i].title != "undefined" && visualizations[i].title != "") {
                            $("#element" + visualizations[i].panel).parent().prepend('<h2 class="panel-title">' + visualizations[i].title + '</h2>')
                        }




                    }
                }
                if (triggerSubtitles) {
                    DoImageSubtitles()
                }
            }
            $("#enableAdvancedSPL").click(function(event) {
                if (event.target.checked == true) {
                    localStorage['sse-splMode'] = "true"
                    $(".mlts-panel-footer").show()
                    $("#outliersPanel .mlts-panel-footer :not(.mlts-show-spl)").show()
                    $("#fieldset1").show()
                    $("#row11").show()
                } else {
                    localStorage['sse-splMode'] = "false"
                    $(".mlts-panel-footer").hide()
                    $("#outliersPanel .mlts-panel-footer").show()
                    $("#outliersPanel .mlts-panel-footer :not(.mlts-show-spl)").hide()
                    $("#fieldset1").hide()
                    $("#row11").hide()
                }
            })
            if (typeof localStorage["sse-splMode"] == "undefined" || localStorage["sse-splMode"] == "false") {
                // console.log("SPL Mode is off, hiding everything")
                $(".mlts-panel-footer").hide()
                $("#outliersPanel .mlts-panel-footer").show()
                $("#outliersPanel .mlts-panel-footer :not(.mlts-show-spl)").hide()
                $("#fieldset1").hide()
                $("#row11").hide()
            }
            $(".dashboard-header").css("margin-bottom", "0")
            
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
              }); 
            //$("<a href=\"" + window.location.href + "&tour=" + showcaseName + "-tour\"><div id=\"Tour\" class=\"tourbtn\" style=\"float: right; margin-right: 15px; margin-top: 5px; \">Launch Tour</div></a>").insertAfter("#searchList")

        }
    };
});