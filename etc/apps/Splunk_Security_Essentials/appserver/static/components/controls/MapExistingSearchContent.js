


require([
    'json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString,
    "underscore",
    "components/controls/BuildTile",
    'components/controls/Modal',
    Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/vendor/lunr.js/lunr.js"),
    "json!" + Splunk.util.make_full_url("/splunkd/__raw/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings?bust=" + Math.round(Math.random() * 15000000)),
    Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/data/common_data_objects.js")
], function(
    ShowcaseInfo,
    _,
    BuildTile,
    Modal,
    lunr,
    local_search_mappings) {

    setTimeout(function(){
        require([Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/CustomContent.js")], function() {
            // Pre-loaded
        })
    },1000)

    function handleContentMappingTelemetry(status, method, obj){
        let allowedChannels = ["Enterprise_Security_Content_Update", "Splunk_App_for_Enterprise_Security", "Splunk_Phantom", "Splunk_Security_Essentials", "Splunk_User_Behavior_Analytics"]
        let record = {"area": "content_mapping", "status": status, "method": method}
        if(obj && obj.channel){
            if(allowedChannels.indexOf(obj.channel) >= 0){
                record.content = obj.id || obj.name
            }
        }else if(obj && obj.app){
            if(allowedChannels.indexOf(obj.app) >= 0){
                record.content = obj.id || obj.name
            }
        }
        // console.log("ADDING TELEMETRY", "BookmarkChange", record)

        require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
            for(let i = 0; i < appConfig.length; i++){
                if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                     record.demoMode = true
                }
            }
            Telemetry.SendTelemetryToSplunk("BookmarkChange", record)
        })
    }


    let search_name_to_showcase_names = {}
    let SPL_to_name = {}
    for (let SummaryName in ShowcaseInfo['summaries']) {
        if (ShowcaseInfo['summaries'][SummaryName]['search_name']) {
            search_name_to_showcase_names[ShowcaseInfo['summaries'][SummaryName]['search_name']] = SummaryName
        }
        if (ShowcaseInfo['summaries'][SummaryName]['examples']) {
            for (let i = 0; i < ShowcaseInfo['summaries'][SummaryName]['examples'].length; i++) {
                if (ShowcaseInfo['summaries'][SummaryName]['examples'][i]['label'] && ShowcaseInfo['summaries'][SummaryName]['examples'][i]['label'].indexOf("Demo") == -1 && ShowcaseInfo['summaries'][SummaryName]['examples'][i]["showcase"] && ShowcaseInfo['summaries'][SummaryName]['examples'][i]["showcase"]["value"]) {
                    if (!SPL_to_name[ShowcaseInfo['summaries'][SummaryName]['examples'][i]["showcase"]["value"].replace(/\s/g, "")]) {
                        SPL_to_name[ShowcaseInfo['summaries'][SummaryName]['examples'][i]["showcase"]["value"].replace(/\s/g, "")] = []
                    }
                    SPL_to_name[ShowcaseInfo['summaries'][SummaryName]['examples'][i]["showcase"]["value"].replace(/\s/g, "")].push(SummaryName)

                }
            }
        }
    }


    /* Standard Search Engine Init*/
    let documents = [];
    let fields = Object.keys(window.searchEngineDefaults);
    for (let SummaryName in ShowcaseInfo['roles']['default']['summaries']) {
        SummaryName = ShowcaseInfo['roles']['default']['summaries'][SummaryName]
        if (typeof ShowcaseInfo['summaries'][SummaryName] == "object") {
            let myobj = { "id": SummaryName };
            for (let myfield in fields) {
                myfield = fields[myfield]
                if (typeof ShowcaseInfo['summaries'][SummaryName][myfield] != "undefined") {
                    myobj[myfield] = ShowcaseInfo['summaries'][SummaryName][myfield]
                }
            };
            documents.push(myobj)
        }
    }
    let index = lunr(function() {
        for (let field in window.searchEngineDefaults) {
            this.field(field, {
                boost: window.searchEngineDefaults[field]
            });
        }
        this.ref('id');
        documents.forEach(function(doc) {
            this.add(doc)
        }, this)
    });


    /* Custom Matching Search Engine Init*/
    let localSchema = {
        "description": 3,
        "searchKeywords": 20,
        "name": 10,
        "relevance": 2,
        "story": 5
    }
    let custom_documents = [];
    let custom_fields = Object.keys(localSchema);
    for (let SummaryName in ShowcaseInfo['roles']['default']['summaries']) {
        SummaryName = ShowcaseInfo['roles']['default']['summaries'][SummaryName]
        if (typeof ShowcaseInfo['summaries'][SummaryName] == "object") {
            let myobj = { "id": SummaryName };
            for (let myfield in custom_fields) {
                myfield = custom_fields[myfield]
                if (typeof ShowcaseInfo['summaries'][SummaryName][myfield] != "undefined") {
                    myobj[myfield] = ShowcaseInfo['summaries'][SummaryName][myfield]
                }
            };
            custom_documents.push(myobj)
        }
    }
    let custom_index = lunr(function() {
        for (let field in localSchema) {
            this.field(field, {
                boost: localSchema[field]
            });
        }
        this.ref('id');
        custom_documents.forEach(function(doc) {
            this.add(doc)
        }, this)
    });

    $.ajax({
        url: $C['SPLUNKD_PATH'] + '/servicesNS/' + $C['USERNAME'] + '/-/saved/searches?output_mode=json&count=0',
        type: 'GET',
        async: true,
        success: function(savedSearchObj) {
            let counter = 0;
            let standardESApps = ["SA-AccessProtection", "DA-ESS-AccessProtection", "SplunkEnterpriseSecuritySuite", "SA-AuditAndDataProtection", "SA-Utils", "DA-ESS-ThreatIntelligence", "SA-EndpointProtection", "Splunk_SA_CIM", "DA-ESS-NetworkProtection", "DA-ESS-EndpointProtection", "DA-ESS-ContentUpdate", "SA-IdentityManagement", "DA-ESS-IdentityManagement", "SA-NetworkProtection", "SA-ThreatIntelligence", "SA-UEBA"]
            let standardIrrelevantApps = ["splunk_archiver", "splunk_monitoring_console"]

            let enabled_searches = {}
            let enabled_content = {}
            let content = []
                // First look to see if exact ES or ESCU 
            for (let i = 0; i < savedSearchObj.entry.length; i++) {
                let search = savedSearchObj.entry[i];
                if (!SPL_to_name[search.content.search.replace(/\s/g, "")]) {
                    SPL_to_name[search.content.search.replace(/\s/g, "")] = []
                }
                SPL_to_name[search.content.search.replace(/\s/g, "")].push(search.name);
                // console.log("Extra logging 1 ", search.name)
                if (search_name_to_showcase_names[search.name]) {
                    if (!search.content.disabled) {
                        if (!enabled_content[search_name_to_showcase_names[search.name]]) {
                            enabled_content[search_name_to_showcase_names[search.name]] = []
                        }
                        enabled_content[search_name_to_showcase_names[search.name]].push({ "name": search.name })
                        if (!enabled_searches[search.name]) {
                            enabled_searches[search.name] = []
                        }
                        enabled_searches[search.name].push(search_name_to_showcase_names[search.name])

                    }
                }
            }
            for (let i = 0; i < savedSearchObj.entry.length; i++) {
                let search = savedSearchObj.entry[i];
                if (SPL_to_name[search.content.search.replace(/\s/g, "")] && SPL_to_name[search.content.search.replace(/\s/g, "")].length > 1 && search.content.disabled == false) {
                    for (let i = 0; i < SPL_to_name[search.content.search.replace(/\s/g, "")].length; i++) {
                        if (search_name_to_showcase_names[SPL_to_name[search.content.search.replace(/\s/g, "")][i]]) {

                            let searchName = SPL_to_name[search.content.search.replace(/\s/g, "")][i]
                            if (search_name_to_showcase_names[searchName]) {
                                if (!enabled_content[search_name_to_showcase_names[searchName]]) {
                                    enabled_content[search_name_to_showcase_names[searchName]] = []
                                }
                                enabled_content[search_name_to_showcase_names[searchName]].push({ "name": search.name })
                                if (!enabled_searches[search.name]) {
                                    enabled_searches[search.name] = []
                                }
                                enabled_searches[search.name].push(search_name_to_showcase_names[searchName])
                            }
                        } else if (ShowcaseInfo['summaries'][SPL_to_name[search.content.search.replace(/\s/g, "")][i]]) {
                            if (!enabled_content[SPL_to_name[search.content.search.replace(/\s/g, "")][i]]) {
                                enabled_content[SPL_to_name[search.content.search.replace(/\s/g, "")][i]] = []
                            }
                            enabled_content[SPL_to_name[search.content.search.replace(/\s/g, "")][i]].push({ "name": search.name })
                            if (!enabled_searches[search.name]) {
                                enabled_searches[search.name] = []
                            }
                            enabled_searches[search.name].push(SPL_to_name[search.content.search.replace(/\s/g, "")][i])
                        }
                    }
                }

                let obj = {}
                let autoirrelevant = false
                obj["title"] = search.name;
                obj["app"] = search.acl.app;
                obj["link"] = search.links.edit;
                obj["search"] = search.content.search;
                obj["displayTitle"] = search.content['action.correlationsearch.label'] || obj["title"];
                obj["description"] = search.content.description;
                obj["isCorrelationSearch"] = false;

                let potentialConfidence = pullFieldsFromSearch(obj["search"], ["risk_confidence", "risk_confidence_default", "confidence"])
                let potentialSeverity = pullFieldsFromSearch(obj["search"], ["risk_severity", "risk_impact", "risk_severity_default", "risk_severity_impact", "severity", "impact"])
                let potentialATTACKTactic = pullFieldsFromSearch(obj["search"], ["attack_tactic", "tactic"])
                let potentialATTACKTechnique = pullFieldsFromSearch(obj["search"], ["attack_technique", "attack_technique"])
                let potentialAlertVolume = "";
                if (potentialConfidence != "") {
                    // have to inverse confidence for alert volume
                    if (potentialConfidence == "Very High") {
                        potentialAlertVolume = "Very Low";
                    }
                    if (potentialConfidence == "High") {
                        potentialAlertVolume = "Low";
                    }
                    if (potentialConfidence == "Low") {
                        potentialAlertVolume = "High";
                    }
                    if (potentialConfidence == "Very Low") {
                        potentialAlertVolume = "Very High";
                    }

                }
                obj["extractions"] = {
                    //"confidence": potentialConfidence,
                    "impact": potentialSeverity,
                    "alertvolume": potentialAlertVolume,
                    "tactic": potentialATTACKTactic,
                    "technique": potentialATTACKTechnique
                }
                // console.log("extracted fields", obj["title"], potentialATTACKTactic, potentialATTACKTechnique, potentialConfidence, potentialSeverity)
                if (search.content['action.notable'] == "1") {
                    obj["isCorrelationSearch"] = true
                }
                obj["isScheduled"] = false;
                if (search.content['disabled'] == false && search.content.cron_schedule.length >= 9) {
                    obj["isScheduled"] = true
                }
                obj["searchObj"] = search
                autoirrelevant = false;
                if (search.name.indexOf(" - Lookup Gen") >= 0 || search.name.indexOf(" - Threat Gen") >= 0 || search.name.indexOf(" - Context Gen") >= 0 ||
                    (standardESApps.indexOf(obj['app']) >= 0 && obj['isCorrelationSearch'] == false) || standardIrrelevantApps.indexOf(obj["app"]) >= 0) {
                    autoirrelevant = true;
                    obj["status"] = "";
                }
                if (obj['isScheduled'] && autoirrelevant == false) {
                    counter++;
                    let searchTitle = obj["title"].replace(" - Rule", "").replace(/_/g, " ").replace(/:/g, "");

                    let searchResults = custom_index.search(searchTitle);
                    let status = "low";
                    let potentialMatch = ""
                    let potentialMatchName = ""
                        //console.log("Looking for", obj["title"], "in", enabled_searches, )
                    if (enabled_searches[obj["title"]]) {
                        status = "exact";
                        potentialMatch = enabled_searches[obj["title"]][0]
                        potentialMatchName = ShowcaseInfo.summaries[potentialMatch].name
                    } else if (searchResults.length == 0) {
                        status = "none"
                    } else if (searchResults[0].score > 20) {
                        if (searchResults.length == 1 || searchResults[0].score - searchResults[1].score > 5) {
                            status = "likely";
                            potentialMatch = searchResults[0].ref
                            potentialMatchName = ShowcaseInfo.summaries[searchResults[0].ref].name
                        } else {
                            let listOfPotentials = [];
                            for (let i = 0; i < searchResults.length; i++) {
                                if (searchResults[i].score > 20) {
                                    listOfPotentials.push(searchResults[i].ref)
                                }
                            }
                            status = "potentials"
                            potentialMatch = listOfPotentials.join("|")
                        }

                    }
                    content.push({
                        status: status,
                        autoirrelevant: autoirrelevant,
                        potentialMatch: potentialMatch,
                        potentialMatchName: potentialMatchName,
                        search: obj
                    })
                    // console.log(obj['title'], searchTitle, status, potentialMatch, potentialMatchName, searchResults)
                }

            }

            // Merge in kvstore entries
            for (let i = 0; i < content.length; i++) {
                content[i]['current_bookmark_status'] = ""
                content[i]['gotOverride'] = false;
                for (let g = 0; g < local_search_mappings.length; g++) {
                    if (content[i].search.title == local_search_mappings[g].search_title) {
                        if (ShowcaseInfo.summaries[local_search_mappings[g].showcaseId]) {
                            content[i]['gotOverride'] = true;
                            content[i]['current_bookmark_status'] = ShowcaseInfo.summaries[local_search_mappings[g].showcaseId]['bookmark_status'];
                            content[i]['status'] = "exact"
                            content[i]['potentialMatch'] = local_search_mappings[g].showcaseId
                            content[i]['potentialMatchName'] = ShowcaseInfo.summaries[local_search_mappings[g].showcaseId]['name']
                        } else {
                            content[i]['gotOverride'] = false;
                            content[i]['status'] = "irrelevant"
                        }
                    }
                }
            }

            let sortOrder = ["likely", "potentials", "low", "exact", "irrelevant"]

            content.sort(function(a, b) {

                if (sortOrder.indexOf(a.status) > sortOrder.indexOf(b.status)) {
                    return 1;
                }
                if (sortOrder.indexOf(a.status) < sortOrder.indexOf(b.status)) {
                    return -1;
                }
                return 0;
            });






            let table = $('<table id="contentList" class="table"><thead><tr><th><i class="icon-info" /></th><th>' + _('Name of Existing Saved Search').t() + '</th><th>' + _('Status').t() + '</th><th>' + _('Splunk Security Essentials Content Name').t() + '</th><th>' + _('Actions').t() + '</th></tr></thead><tbody></tbody></table>')
            let tbody = table.find("tbody")
                // console.log("Got my data!", data)
            for (let i = 0; i < content.length; i++) {
                if (content[i]['status'] == "exact" && content[i]['gotOverride'] == false) {
                    updateStatus(content[i]['search']['title'], content[i]['potentialMatch'], "exact", "automation")
                }
                if (content[i]['status'] == "exact" && content[i]['current_bookmark_status'] != "successfullyImplemented") {
                    updateStatus(content[i]['search']['title'], content[i]['potentialMatch'], "exact", "automation")
                }

                let contentDescriptionRow = $("<tr>").css("display", "none").addClass("contentDescriptionRow").attr("data-searchname", content[i]['search']['title']).attr("data-id", content[i]['search']['title'].replace(/[^a-zA-Z0-9\-_]/g, ""))
                let descriptionContent = $('<td colspan="5">')
                descriptionContent.append($('<div><h3>' + _('App').t() + '</h3><p>' + content[i].search.app + '</p></div>'))
                descriptionContent.append($('<div><h3>' + _('Description').t() + '</h3><p>' + content[i].search.description + '</p></div>'))
                descriptionContent.append($('<div><h3>' + _('Last Updated').t() + '</h3><p>' + content[i].search.searchObj.updated + '</p></div>'))
                descriptionContent.append($('<div><h3>' + _('Author').t() + '</h3><p>' + content[i].search.searchObj.author + '</p></div>'))
                descriptionContent.append($('<div><h3>' + _('Search String').t() + '</h3></div>').append($("<p>").text(content[i].search.search)))
                contentDescriptionRow.append(descriptionContent)

                let row = $("<tr>").addClass("contentTitleRow").attr("data-searchname", content[i]['search']['title']).attr("data-id", content[i]['search']['title'].replace(/[^a-zA-Z0-9\-_]/g, "")).attr("data-content", JSON.stringify(content[i]))
                if (content[i]['status'] == "exact") {
                    row.attr("data-showcaseid", content[i]['potentialMatch'])
                }
                row.append("<td class=\"tableexpand\" class=\"downarrow\" ><a href=\"#\" onclick=\"doSearchMapToggle(this); return false;\"><i class=\"icon-chevron-right\" /></a></td>")
                let link = $C['SPLUNKD_PATH'].replace("/splunkd/__raw", "") + "/manager/Splunk_Security_Essentials/saved/searches?app=" + content[i].search.app + "&count=10&offset=0&itemType=&owner=&search=" + encodeURIComponent(content[i]['search']['title'])
                row.append($('<td class="content-searchname">').text(content[i]['search']['title']).append($("<a>").attr("href", link).attr("target", "_blank").addClass("external drilldown-link")))


                row.append($('<td class="content-status">').append(generateStatusIcon(content[i]['status'])))


                let potentialMatchText = generateShowcaseColumnHTML(content[i]['potentialMatch'])
                if (content[i]['status'] == "likely") {
                    row.attr("data-prediction", content[i]['potentialMatch'])
                    potentialMatchText.css("color", "gray")
                } else if (content[i]['status'] == "potentials") {
                    potentialMatchText.css("color", "gray")
                }
                row.append($('<td class="content-potentialMatches">').append(potentialMatchText))

                row.append($('<td class="content-actions">').append(generateActionText(content[i], index)))
                tbody.append(row, contentDescriptionRow)
            }

            $("#localContentLoading").modal("hide")
            let myModal = new Modal('localContent', {
                title: _('Map Saved Searches to Splunk\'s Out-Of-The-Box Content').t(),
                destroyOnHide: true,
                type: 'wide'
            });
            window.dvtest = myModal
            myModal.$el.addClass("modal-basically-full-screen")

            myModal.body.html($('<p>' + _('Below is a list of all scheduled searches in your environment.').t() + '</p>'))
            myModal.body.append(table)
            myModal.footer.append($('<button>').attr({
                type: 'button'
            }).addClass('btn').css("float", "left").text( _('Button Explanation').t() ).click(function(){
                let myModal = new Modal('buttonExplanation', {
                    title: _('Button Explanation').t(),
                    destroyOnHide: true,
                    type: 'wide'
                });
    
                myModal.body.html($("<div>").append($("<p>" + _("Click <i>Look for Enabled Content</i> below to get a list of all of your local saved searches. For each saved, you'll have the following options available:").t() + "</p>"), 
                $("<ul>").append(
                    $("<li>").html("<b>" +  _("Accept Recommendation").t() + "</b>: " + _("If we can't find an exact match, but when we run your content through a search engine we get just one pretty decent match, you can click Accept Recommendation to map that saved search on your system to the suggested out-of-the-box Splunk content, marking that content as Successfully Implemented so it will show up as \"Active\" in the Analytics Advisor and include all of the metadata such as MITRE ATT&CK and Kill Chain mappings.").t()),
                    $("<li>").html("<b>" +  _("Search").t() + "</b>: " + _("Opens a search dialog that will look through all of the content in Splunk Security Essentials (including any custom content you've created) and let you select the content that maps closely, marking that content as Successfully Implemented so it will show up as \"Active\" in the Analytics Advisor and include all of the metadata such as MITRE ATT&CK and Kill Chain mappings.").t()), 
                    $("<li>").html("<b>" +  _("Create New").t() + "</b>: " + _("If you don't see any content in Splunk Security Essentials that represents this detection, you can create a piece of custom content in Splunk Security Essentials. Custom content lets you do all of the tagging that normal content has (MITRE, Kill Chain, Categories, and more!), and will show up in all parts of the app. You can even create content for detections you have that run outside of Splunk, so that the kill chain view is fully populated!").t()), 
                    $("<li>").html("<b>" +  _("Not a Detection").t() + "</b>: " + _("If this particular piece of content is not a security detection, then you can mark it as such. This will be excluded from display anywhere in Splunk Security Essentials.").t()),
                    $("<li>").html( "<b>" + _("Clear").t() + "</b>: " + _("If you accidentally marked this content, but have second thoughts, you can clear the mapping and we'll pretend you never clicked anything.").t() ) )))
                
                myModal.footer.append($('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                }).addClass('btn btn-primary ').text('Close'))
                myModal.show()
            }), $('<button>').attr({
                type: 'button',
                'data-dismiss': 'modal'
            }).addClass('btn btn-primary ').text('Close'))
            myModal.show()
            $("#localContent").find(".modal-header").append($("<div>").attr("id", "ContentMappingStatus"))
            updateCount()

        }
    })



    function generateActionText(content, index) {

        let actionText = $("<div>")

        if (content['status'] == "likely") {
            actionText.append($("<div>").addClass("action_acceptRecommendation").text("Accept Recommendation").click(function(evt) {
                let content = JSON.parse($(evt.target).closest("tr").attr("data-content"))
                let showcaseId = $(evt.target).closest("tr").attr("data-prediction")
                let search_title = $(evt.target).closest("tr").attr("data-searchname")
                $(evt.target).closest("tr").find(".content-potentialMatches").find("div").css("color", "black")
                $(evt.target).closest("tr").find(".content-status").html(generateStatusIcon("exact"))

                content['status'] = "exact"
                $(evt.target).closest("tr").attr("data-content", JSON.stringify(content))
                updateStatus(search_title, showcaseId, "exact", "manual")
                $(evt.target).closest("td").html(generateActionText(content, index))

            }))
        }
        actionText.append($("<div>").addClass("action_findOther").text("Search").click(function(evt) {
            let content = JSON.parse($(evt.target).closest("tr").attr("data-content"))
            let contentSelected = $.Deferred()
            let search_title = $(evt.target).closest("tr").attr("data-searchname")
            $.when(contentSelected).then(function(showcaseId) {

                $(evt.target).closest("tr").find(".content-potentialMatches").find("div").css("color", "black").html(generateShowcaseColumnHTML(showcaseId))
                $(evt.target).closest("tr").find(".content-status").html(generateStatusIcon("exact"))

                content['status'] = "exact"
                $(evt.target).closest("tr").attr("data-content", JSON.stringify(content))
                updateStatus(search_title, showcaseId, "exact", "manual")
                $(evt.target).closest("td").html(generateActionText(content, index))
            })

            let myModal = new Modal('SearchForContent', {
                title: 'Search for Content',
                destroyOnHide: true,
                type: 'wide'
            });
            myModal.$el.addClass("modal-extra-wide")
            myModal.body.html($('<p>' + _('Select Your Content Below').t() + '</p>'))

            var timeoutId = 0;
            myModal.body.append($('<input id="searchBar" type="text" style="width: 300px" aria-label="Input" />').on('keyup', function(e) {
                var code = e.keyCode || e.which;
                if (code == 13) {
                    clearTimeout(timeoutId);

                    doSearch(index.search($("#searchBar").val()), contentSelected)
                } else if ($("#searchBar").val().length >= 4) {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(doSearch, 500);
                }
            }))

            myModal.body.append("<hr />")

            myModal.body.append("<p id=\"searchResultCount\"></p>")

            myModal.body.append("<div id=\"searchResults\"></div>")

            myModal.footer.append($('<button>').attr({
                type: 'button',
                'data-dismiss': 'modal'
            }).addClass('btn btn-primary ').text('Cancel'))
            myModal.show()

        }))
        actionText.append($("<div>").addClass("action_createNew").text("Create New").click(function(evt) {
            let content = JSON.parse($(evt.target).closest("tr").attr("data-content"))
            let search_title = $(evt.target).closest("tr").attr("data-searchname")
            // console.log("Running New for", content)
            let summary = {
                "name": content['search']['displayTitle'],
                "displayapp": content['search']['app'],
                "app": content['search']['app'],
                "description": content['search']['description'],
                "bookmark_status": "successfullyImplemented",
                "bookmark_user": $C['USERNAME'],
                "search": content['search']['search']
            }

            require([Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/CustomContent.js")], function() {
                customContentModal(function(showcaseId, summary) {

                    // There's some processing that occurs in SSEShowcaseInfo and we want to get the full detail here.
                    ShowcaseInfo.summaries[showcaseId] = summary
                    ShowcaseInfo.roles.default.summaries.push(showcaseId)
                    // console.log("Return from creating new content", showcaseId, summary, generateShowcaseColumnHTML(showcaseId))
                    $(evt.target).closest("tr").find(".content-potentialMatches").html(generateShowcaseColumnHTML(showcaseId))
                    $(evt.target).closest("tr").find(".content-status").html(generateStatusIcon("exact"))

                    content['status'] = "exact"
                    $(evt.target).closest("tr").attr("data-content", JSON.stringify(content))
                    updateStatus(search_title, showcaseId, "exact", "custom")
                    $(evt.target).closest("td").html(generateActionText(content, index))
                }, summary, content['search']['extractions'])
            })
        }))

        if (content['status'] != "irrelevant") {
            actionText.append($("<div>").addClass("action_markIrrelevant").text("Not A Detection").click(function(evt) {
                let content = JSON.parse($(evt.target).closest("tr").attr("data-content"))
                content['status'] = "irrelevant"
                $(evt.target).closest("tr").attr("data-content", JSON.stringify(content))
                let search_title = $(evt.target).closest("tr").attr("data-searchname")
                $(evt.target).closest("tr").find(".content-potentialMatches").html("")
                $(evt.target).closest("tr").find(".content-status").html(generateStatusIcon("irrelevant"))
                updateStatus(search_title, "", "irrelevant", "manual")
                $(evt.target).closest("td").html(generateActionText(content, index))
            }))
        }
        if (content['status'] != "UNKNOWN" && content['status'] != "low") {
            actionText.append($("<div>").addClass("action_clear").text("Clear ").append("<i class=\"icon-close\">").click(function(evt) {
                let content = JSON.parse($(evt.target).closest("tr").attr("data-content"))
                content['status'] = "UNKNOWN"
                $(evt.target).closest("tr").attr("data-content", JSON.stringify(content))

                let search_title = $(evt.target).closest("tr").attr("data-searchname")
                $(evt.target).closest("tr").find(".content-potentialMatches").html("")
                $(evt.target).closest("tr").find(".content-status").html(generateStatusIcon("UNKNOWN"))
                updateStatus(search_title, "", "UNKNOWN", "manual")
                $(evt.target).closest("td").html(generateActionText(content, index))
                // console.log("Running Clear for", content)
            }))
        }
        return actionText
    }

    function pullFieldsFromSearch(string, fields) {
        for (let i = 0; i < fields.length; i++) {
            window.dvtest3 = fields[i];
            if (fields[i] == "attack_technique" && string.indexOf("eval " + fields[i] + "=\"T")) {
                let segment = string.substring(string.indexOf("eval " + fields[i] + "=\"T") + ("eval " + fields[i] + "=\"").length)
                // console.log("segment", fields[i], segment, string)
                return segment.substr(0, segment.indexOf(" ")).replace(/[^T\d]/g, "")
            }

            if (string.indexOf("eval " + fields[i] + "=\"") >= 0) {
                window.dvtest1 = string
                window.dvtest2 = fields[i];
                let segment = string.substring(string.indexOf("eval " + fields[i] + "=\"") + ("eval " + fields[i] + "=\"").length)
                segment = segment.substr(0, segment.indexOf('"'))
                // console.log("segment", fields[i], segment)
                if (segment.indexOf("\|") == -1) {
                    return segment
                }
            }
            if (string.indexOf(", " + fields[i] + "=\"") >= 0) {
                let segment = string.substring(string.indexOf("eval " + fields[i] + "=\"") + ("eval " + fields[i] + "=\"").length)
                segment = segment.substr(0, segment.indexOf('"'))
                // console.log("segment", fields[i], segment)
                if (segment.indexOf("\|") == -1) {
                    return segment
                }
            }
        }
        return ""
    }

    function doSearch(results, deferral) {
        // This function is copied from addBookmark in bookmarked_content.js, but pulled var results = indexSearch($("#searchBar").val())
        // console.log("Here are my search results against '" + $("#searchBar").val() + "'", results)
        let maxSearchResults = 20;

        if (results.length > maxSearchResults) {
            $("#searchResultCount").text( Splunk.util.sprintf(_("Showing %s out of %s results.").t(), maxSearchResults, results.length))
        } else {
            $("#searchResultCount").text(Splunk.util.sprintf(_("Showing all %s results.").t(), results.length))
        }
        var tiles = $('<ul class="showcase-list"></ul>')

        for (var i = 0; i < results.length && i < maxSearchResults; i++) {
            if (typeof ShowcaseInfo['summaries'][results[i].ref] != "undefined") {

                let tile = $("<li style=\"width: 230px; height: 320px\"></li>").addClass("showcaseItemTile").append(BuildTile.build_tile(ShowcaseInfo['summaries'][results[i].ref], true))
                if (results[i].score > 10) {
                    tile.addClass("topSearchHit")
                }
                let journeyStage = tile.find("a[href^=journey]").text()
                let dashboardhref = tile.find("a").first().attr("href");
                tile.attr("data-showcaseid", results[i].ref)
                // console.log("Got my dashboardhref", dashboardhref)
                while (tile.find("a").length > 0) {
                    tile.find("a")[0].outerHTML = tile.find("a")[0].outerHTML.replace(/^<a/, "<span").replace(/<\/a>/, "</span>")
                }
                tile.click(function(evt) {
                    let target = $(evt.target);
                    let showcaseId = target.closest("li").attr("data-showcaseid");

                    if (target.prop('tagName') != "A") {
                        deferral.resolve(showcaseId)
                        $("#SearchForContent").modal("hide")
                    }

                })
                tile.find("a[href^=journey]").replaceWith("<span style=\"font-weight: normal\">Journey " + journeyStage + "</span>")

                tile.prepend('<a href="' + dashboardhref + '" style="float: right" class="external drilldown-icon" target="_blank"></a>')
                tiles.append(tile)
            }

        }
        $("#searchResults").html(tiles)

    }

    function updateCount() {
        let totalItems = $(".contentTitleRow").find(".content-status").find("i").length;
        let irrelevant = $(".contentTitleRow").find(".content-status").find("i.icon-close").length
        let complete = $(".contentTitleRow").find(".content-status").find("i.icon-check").length
        $("#ContentMappingStatus").html(Splunk.util.sprintf(_("%s complete / %s irrelevant / %s remaining").t(), complete, irrelevant, (totalItems - irrelevant - complete) ))
    }

    function updateStatus(search_title, showcaseId, status, method) {
        bustCache();
        // console.log("Got a status update request for", search_title, status, showcaseId)
            // Close the toggle if it's open
        if ($(".contentDescriptionRow[data-id=" + search_title.replace(/[^a-zA-Z0-9\-_]/g, "") + "]").css("display") == "table-row") {
            doSearchMapToggle($(".contentTitleRow[data-id=" + search_title.replace(/[^a-zA-Z0-9\-_]/g, "") + "]").find("td")[0])
        }
        // force refresh on the bookmark page
        if ($("#localContent").find(".modal-footer").find("button.btn-primary").attr("data-isrefreshset") != "yes") {
            $("#localContent").on("hide", function() {
                location.reload()
            })
            $("#localContent").find(".modal-footer").find("button.btn-primary").attr("data-isrefreshset", "yes").text( _("Refresh Page").t() )
        }

        updateCount()
            // record status in dedicated kvstore
        let record = {
            _time: (new Date).getTime() / 1000,
            _key: search_title.replace(/[^a-zA-Z0-9]/g, ""),
            search_title: search_title,
            showcaseId: showcaseId,
            user: Splunk.util.getConfigValue("USERNAME")
        }
        handleContentMappingTelemetry(status, method, ShowcaseInfo.summaries[showcaseId]);
        if (status == "UNKNOWN") {

            $.ajax({
                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/?query={"_key": "' + record['_key'] + '"}',
                type: 'GET',
                contentType: "application/json",
                async: true,
                success: function(returneddata) {
                    if (returneddata.length != 0) {
                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/' + record['_key'],
                            type: 'DELETE',
                            async: true
                        })
                    }
                },
                error: function(error, data, other) {
                    //     console.log("Error Code!", error, data, other)
                }
            })
        } else {

            $.ajax({
                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/?query={"_key": "' + record['_key'] + '"}',
                type: 'GET',
                contentType: "application/json",
                async: true,
                success: function(returneddata) {
                    if (returneddata.length == 0) {
                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/',
                            type: 'POST',
                            async: true,
                            contentType: "application/json",
                            data: JSON.stringify(record),
                            success: function(returneddata) {bustCache(); newkey = returneddata },
                            error: function(xhr, textStatus, error) {

                            }
                        })
                    } else {
                        // Old
                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/' + record['_key'],
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
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
        // update bookmark_status
        // get the current Showcase ID

        // console.log("Evaluating clearing the bookmark from", )
        let currentDivShowcaseId = $("tr.contentTitleRow[data-id=" + search_title.replace(/[^a-zA-Z0-9\-_]/g, "") + "]").attr("data-showcaseid")

        // Set the new Showcase ID
        $("tr.contentTitleRow[data-id=" + search_title.replace(/[^a-zA-Z0-9\-_]/g, "") + "]").attr("data-showcaseid", showcaseId)

        if (((status == "UNKNOWN" || status == "irrelevant") && currentDivShowcaseId && currentDivShowcaseId != "") // If we are unsetting the status altogether
            ||
            (currentDivShowcaseId && currentDivShowcaseId != "" && showcaseId && showcaseId != "")) { // If we're changing this to a new showcase

            let ShouldUnset = true;
            for (let i = 0; i < $("tr.contentTitleRow").length; i++) {
                if ($($("tr.contentTitleRow")[i]).attr("data-showcaseid") == currentDivShowcaseId) {
                    ShouldUnset = false;
                    // console.log("Not deleting the bookmark because we found a match", $($("tr.contentTitleRow")[i]))
                }
            }
            // we need to unset this "successfullyImplemented" bookmark
            if (ShouldUnset) {
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/?query={"_key": "' + currentDivShowcaseId + '"}',
                    type: 'GET',
                    contentType: "application/json",
                    async: true,
                    success: function(returneddata) {
                        if (returneddata.length != 0) {
                            $.ajax({
                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/' + currentDivShowcaseId,
                                type: 'DELETE',
                                async: true
                            })
                        }
                    },
                    error: function(error, data, other) {
                        //     console.log("Error Code!", error, data, other)
                    }
                })
            }

        } else if (showcaseId && showcaseId != "" && showcaseId != null) {
            // console.log("Trying to set bookmark status for", showcaseId)
            let record = {
                _time: (new Date).getTime() / 1000,
                _key: showcaseId,
                showcase_name: ShowcaseInfo.summaries[showcaseId].name,
                status: 'successfullyImplemented',
                user: Splunk.util.getConfigValue("USERNAME")
            }
            $.ajax({
                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/?query={"_key": "' + record['_key'] + '"}',
                type: 'GET',
                contentType: "application/json",
                async: true,
                success: function(returneddata) {
                    if (returneddata.length == 0) {
                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
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
                            async: true,
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
        // 


    }

    function generateStatusIcon(status) {

        let statusText = $("<i>").css("font-size", "20px").attr("data-status", status)
        if (status == "exact") {
            statusText.addClass("icon-check").css("color", "green")
        } else if (status == "likely") {
            statusText.addClass("icon-question-circle").css("color", "orange")
        } else if (status == "potentials") {
            statusText.addClass("icon-question-circle").css("color", "gray")
        } else if (status == "irrelevant") {
            statusText.addClass("icon-close").css("color", "gray").attr("title", _("Marked as Irrelevant").t())
        }
        return statusText
    }

    function generateShowcaseColumnHTML(string) {
        if (string) {

            let potentialMatchText = $("<div>")

            let ids = string.split("|")
            for (let i = 0; i < ids.length; i++) {
                let id = ids[i]
                let local = $("<div>")
                local.append(ShowcaseInfo.summaries[id].name)
                if (ShowcaseInfo.summaries[id].dashboard && ShowcaseInfo.summaries[id].dashboard != "" && ShowcaseInfo.summaries[id].dashboard != null) {
                    local.append($("<a>").attr("href", ShowcaseInfo.summaries[id].dashboard).attr("target", "_blank").addClass("external drilldown-link"))
                }
                potentialMatchText.append(local)

            }
            return potentialMatchText;
            // ShowcaseInfo.summaries[showcaseId]['name']
            // let link = $C['SPLUNKD_PATH'].replace("/splunkd/__raw", "") + "/manager/Splunk_Security_Essentials/saved/searches?app=" + content[i].search.app + "&count=10&offset=0&itemType=&owner=&search=" + encodeURIComponent(content[i]['search']['title'])
        } else {
            return $("<div />")
        }
    }


})


function doSearchMapToggle(obj) {
    let container = $(obj).closest(".contentTitleRow");
    let rowId = container.attr("data-id");
    let chevron = container.find(".icon-chevron-down, .icon-chevron-right")
    if (chevron.attr("class") == "icon-chevron-down") {
        $(".contentDescriptionRow[data-id=\"" + rowId + "\"]").css("display", "none")
        chevron.attr("class", "icon-chevron-right")
    } else {
        $(".contentDescriptionRow[data-id=\"" + rowId + "\"]").css("display", "table-row")
        chevron.attr("class", "icon-chevron-down")
        $(".contentDescriptionRow[data-id=\"" + rowId + "\"]").find("td").css("border-top", 0)
    }

}