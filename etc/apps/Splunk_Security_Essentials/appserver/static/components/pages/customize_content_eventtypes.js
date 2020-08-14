'use strict';

$('head').append('<link rel="stylesheet" type="text/css" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">');

require(['jquery',
    "splunkjs/ready!"
], function($) {
    function doBump() {
        $.ajax({
            url: '/en-US/_bump',
            type: 'GET',
            async: false,
            success: function(returneddata) {
                let baseBump = returneddata;
                let postValue = $(baseBump).find("input[type=hidden]").val();
                //console.log("Initial Bump Page", returneddata);
                $.ajax({
                    url: '/en-US/_bump',
                    type: 'POST',
                    data: "splunk_form_key=" + postValue,
                    async: false,
                    success: function(returneddata) {
                        bustCache(); 
                        // console.log("Final Bump", returneddata); 
                    },
                    error: function(xhr, textStatus, error) {
                        bustCache(); 
                        // console.error("Error Updating!", xhr, textStatus, error);
                    }
                })
            },
            error: function(xhr, textStatus, error) {
                // console.error("Error Updating!", xhr, textStatus, error);
            }
        })
    }

    doBump();
    setTimeout(function() { doBump() }, 1000);
    $("#container").html("<h1>Choose Your Adventure</h1>")

    $("#container").append(
        $('<button class="btn btn-primary" style="margin:10px;">Data Source Categories</button>').click(function() {
            makeItHappen("eventtypes");
            $("#container").html("<h1>Loading...</h1>")
        })), 
        $("#container").append($('<button class="btn btn-primary" style="margin:10px;">MITRE ATT&CK</button>').click(function() {
            makeItHappen("mitre");
            $("#container").html("<h1>Loading...</h1>")
        })), 
        $("#container").append($('<button class="btn btn-primary" style="margin:10px;">MITRE ATT&CK - UBA Update</button>').click(function() {
            window.simplifyJustUBA = 1
            makeItHappen("mitre");
            $("#container").html("<h1>Loading...</h1>")
        })), 
        $("#container").append($('<button class="btn btn-primary" style="margin:10px;">Related</button>').click(function() {
            makeItHappen("related");
            $("#container").html("<h1>Loading...</h1>")
        })
    )

})



function makeItHappen(what_are_we_doing) {
    window.appName = "Splunk_Security_Essentials"
    require(['jquery',
        "splunkjs/mvc/utils",
        "splunkjs/mvc/tokenutils",
        "splunkjs/mvc/simpleform/formutils",
        'splunkjs/mvc/simplexml/controller',
        'splunkjs/mvc/dropdownview',
        "splunkjs/mvc/simpleform/input/dropdown",
        'splunk.util',
        'components/data/parameters/RoleStorage',
        'Options',
        'app/Splunk_Security_Essentials/components/controls/Modal',
        "components/controls/BuildTile",
        "splunkjs/mvc/searchmanager",
        'json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitreattack&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitrepreattack&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=data_inventory&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products',
        'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes',
        'https://code.jquery.com/ui/1.12.1/jquery-ui.js',
        'bootstrap.popover'
    ], function($,
        utils,
        tokenutils,
        FormUtils,
        DashboardController,
        DropdownView,
        DropdownInput,
        SplunkUtil,
        RoleStorage,
        Options,
        Modal,
        BuildTile,
        SearchManager,
        ShowcaseInfo,
        mitre_attack,
        mitre_preattack,
        data_inventory,
        data_inventory_products,
        data_inventory_eventtypes) {
        window.missing = {}
        $("#container").html("")
        $("#container").append(
            $("<h2 id=\"statusIndicator\">"),
            $('<button class="btn btn-primary">Hide Completed</button>').click(function() {
                $(".showcase.completed").hide()
                    //$(".showcase.BadDataSource").hide()
            }), $("<br/>")
        )

        let savedSearchObj = {}
        $.ajax({
            url: $C['SPLUNKD_PATH'] + '/services/saved/searches?output_mode=json&count=0',
            type: 'GET',
            async: false,
            success: function(returneddata) {
                savedSearchObj = returneddata;
                // console.log("Got a response", returneddata);
            },
            error: function(xhr, textStatus, error) {
                console.error("Error Updating!", xhr, textStatus, error);
                triggerError(xhr.responseText);
            }
        })

        for (let i = 0; i < ShowcaseInfo['roles']['default']['summaries'].length; i++) {
            let SummaryName = ShowcaseInfo['roles']['default']['summaries'][i]
            let Summary = ShowcaseInfo['summaries'][SummaryName];
            if (typeof Summary.includeSSE == "undefined" || Summary.includeSSE == "No") {
                continue;
            }
            let ShowcaseDiv = $("<div class=\"showcase\" id=\"" + SummaryName + "\">")



            ShowcaseDiv.append($("<h2>").text(Summary.name))
            ShowcaseDiv.append($("<h3>").text(Summary.displayapp))
            ShowcaseDiv.append($("<p>").text(Summary.description))
            if(Summary.id.indexOf("AT")>=0 && Summary.detections && Summary.detections.length>0){
                let myTable = $('<table class="table"><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody></tbody></table>')
                for(let i = 0; i < Summary.detections.length; i++ ){
                    myTable.append($("<tr>").append($("<td>").text(Summary.detections[i].name), $("<td>").text(Summary.detections[i].description)))
                }
                ShowcaseDiv.append($("<h3>").text("Detections"))
                ShowcaseDiv.append(myTable)
            }
            for (let i = 0; i < savedSearchObj.entry.length; i++) {
                if (savedSearchObj.entry[i].name == "ESCU - " + Summary.name + " - Rule") {
                    ShowcaseDiv.append($("<h3>").text("Search"))
                    ShowcaseDiv.append($("<pre>").text(savedSearchObj.entry[i].content.search))

                }
            }
            let ds_parent = $("<div class=\"customize-datasources\">")
            let mitre_parent = $("<div class=\"customize-mitre\">")
            let related_parent = $("<div class=\"customize-related\">")


            // Start MITRE Processing
            if (what_are_we_doing == "mitre") {
                if(window.simplifyJustUBA == true && (Summary.app="Splunk_User_Behavior_Analytics" && Summary.id.indexOf("TT") >= 0 || Summary.app!="Splunk_User_Behavior_Analytics")){
                    continue;
                }

                let mitre = SummarizeMitre(mitre_attack, mitre_preattack)
                window.mitre = mitre
                if (typeof Summary.mitre_tactic != "undefined") {
                    Summary.mitre_tactic = Summary.mitre_tactic.split("|")
                    if(Summary.mitre_tactic.indexOf("None") >= 0){
                        Summary.mitre_tactic.splice(Summary.mitre_tactic.indexOf("None"), 1)
                    }
                    if(Summary.mitre_tactic.indexOf("") >= 0){
                        Summary.mitre_tactic.splice(Summary.mitre_tactic.indexOf(""), 1)
                    }
                } else if (typeof Summary.mitre_tactic == "undefined") {
                    Summary.mitre_tactic = []
                }
                if (typeof Summary.mitre_technique != "undefined") {
                    Summary.mitre_technique = Summary.mitre_technique.split("|")
                    if(Summary.mitre_technique.indexOf("None") >= 0){
                        Summary.mitre_technique.splice(Summary.mitre_technique.indexOf("None"), 1)
                    }
                    if(Summary.mitre_technique.indexOf("") >= 0){
                        Summary.mitre_technique.splice(Summary.mitre_technique.indexOf(""), 1)
                    }
                } else if (typeof Summary.mitre_technique == "undefined") {
                    Summary.mitre_technique = []
                }
                while (Summary.mitre_technique.indexOf("") >= 0) {
                    Summary.mitre_technique.splice(Summary.mitre_technique.indexOf(""), 1)
                }
                if (Summary.mitre_technique.length > 0) {
                    ShowcaseDiv.addClass("completed")
                }

                let mitre_techniques = $("<div class=\"technique_container\">")

                let notesIfPresent = $("<div class=\"methodology-notes\">")
                if (typeof Summary.mitre_notes != "undefined") {
                    notesIfPresent.text(Summary.mitre_notes);
                }
                mitre_parent.append($("<h3>Methodology Notes (Public to Customers)</h3>").append($('<i class="icon-pencil"/>').click(function(evt) { launchNotesWindow($(evt.target)) })), notesIfPresent, $("<h3>Tactics and Techniques:</h3>"), $("<p>Pre-Attack:</p>"))
                let sorted_tactics = Object.keys(mitre.pre_attack).sort()
                for (let counter = 0; counter < sorted_tactics.length; counter++) {
                    let tactic = sorted_tactics[counter]
                    let addClass = ""
                    if (Summary.mitre_tactic.indexOf(tactic) >= 0) {
                        addClass = " active"
                    }
                    mitre_parent.append($("<button class=\"mitreTactic " + addClass + "\" tactic=\"" + tactic + "\">").text(mitre.pre_attack[tactic].name).click(function(evt) {
                        let target = $(evt.target);
                        let tacticId = target.attr("tactic")
                        let showcaseId = target.closest(".showcase").attr("id")
                        let container = target.closest(".customize-mitre")

                        container.find(".technique_container").html("")
                        container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.pre_attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique))
                        window.dvtest = GenerateListOfMITRETechniques(mitre.pre_attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique)

                    }))
                }
                mitre_parent.append($("<p>Attack:</p>"))

                sorted_tactics = Object.keys(mitre.attack).sort()
                for (let counter = 0; counter < sorted_tactics.length; counter++) {
                    let tactic = sorted_tactics[counter]
                    let addClass = ""

                    if (Summary.mitre_tactic.indexOf(tactic) >= 0) {
                        addClass = " active"
                    }

                    mitre_parent.append($("<button class=\"mitreTactic " + addClass + "\" tactic=\"" + tactic + "\">").text(mitre.attack[tactic].name).click(function(evt) {
                        let target = $(evt.target);
                        let tacticId = target.attr("tactic")
                        let showcaseId = target.closest(".showcase").attr("id")
                        let container = target.closest(".customize-mitre")
                        container.find(".technique_container").html("")
                        container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique))
                        window.dvtest = GenerateListOfMITRETechniques(mitre.attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique)
                    }))
                }
                mitre_parent.append(mitre_techniques)
                ShowcaseDiv.append(mitre_parent)
            }
            // End MITRE Processing


            // Start Datasource Processing

            if (what_are_we_doing == "eventtypes") {
                let ds_list = Summary.datasource.split("|");
                let et_list = []
                if (typeof Summary.eventtypes != "undefined") {
                    et_list = Summary.eventtypes.split("|");
                }
                for (let dsnum = 0; dsnum < ds_list.length; dsnum++) {
                    ds = ds_list[dsnum];
                    let dsdiv = $("<div class=\"datasource\">")
                    let banner = $("<h3>").text("Data Source: " + ds + " ")
                    banner.append($("<i class=\"icon-pencil\" />").click(function(event) {
                        ShowcaseDiv = $(event.target).closest(".showcase")
                        updateDataSource(ShowcaseDiv.attr("id"))
                        // console.log("Got a change request for ", ShowcaseDiv.attr("id"))
                    }))
                    dsdiv.append(banner)
                    let high_level_eventtype = ""
                    for (let hlet in data_inventory) {
                        if (data_inventory[hlet]['name'] == ds) {
                            high_level_eventtype = hlet;
                        }
                    }
                    if (high_level_eventtype == "") {
                        ShowcaseDiv.addClass("BadDataSource")
                        if (typeof window.missing[ds] == "undefined") {
                            window.missing[ds] = 1
                        } else {
                            window.missing[ds]++
                        }
                        // console.log("No data foundation found for:", ds)
                    } else {
                        let etdiv = $("<div id=\"" + high_level_eventtype + "\">")
                        for (let eventtype in data_inventory[high_level_eventtype].eventtypes) {
                            let addlclass = ""
                            if (et_list.indexOf(eventtype) >= 0) {
                                addlclass = " active"
                                ShowcaseDiv.addClass("completed")
                            } else if (Object.keys(data_inventory[high_level_eventtype].eventtypes).length == 1) {
                                addlclass = " nobrainer"
                            }
                            etdiv.append($("<button class=\"eventtype" + addlclass + "\" id=\"" + eventtype + "\">").text(data_inventory[high_level_eventtype].eventtypes[eventtype].name))
                        }
                        dsdiv.append(etdiv)
                    }
                    ds_parent.append(dsdiv)
                }
                ShowcaseDiv.append(ds_parent)
            }

            // End data source processing



            // Start Related Processing 

            if (what_are_we_doing == "related") {

                if (typeof Summary.relatedUseCases == "undefined") {
                    Summary.relatedUseCases = []
                }
                let addDiv = $('<div class="addRelatedDiv">')
                addDiv.append("<h3>Select Use Case to add as Related</h3>")
                addDiv.append("<input class=\"useCasesDropdown\">")
                addDiv.append("<br/>")
                addDiv.append($('<button class="btn" style="margin-left: 10px">Add _only_ to this one example</button>').click(function(evt) {
                    let target = $(evt.target)
                    let container = target.closest(".showcase")
                    let showcaseId = container.attr("id")
                    let newItem = container.find(".useCasesDropdown").val().replace(/ \/\/.*/, "")
                    let Related = ShowcaseInfo['summaries'][newItem]
                    // console.log("Adding ", newItem, " JUST to ", showcaseId)
                    container.find("li.placeholder").remove()

                    let relatedTile = BuildTile.build_tile(Related, false, newItem)
                    relatedTile.find(".bookmarkIcon").replaceWith($('<i class="icon-x" style="float: right; font-size: 18pt;"/>').click(function(evt) {
                        removeRelated(evt)
                    }))
                    container.find("ul.showcase-list").append(relatedTile)
                    recordChangedRelated("add", [showcaseId, newItem])

                }))
                addDiv.append($('<button class="btn btn-primary" style="margin-left: 10px">Add to entire group</button>').click(function(evt) {
                    let target = $(evt.target)
                    let container = target.closest(".showcase")
                    let showcaseId = container.attr("id")
                    let newItem = container.find(".useCasesDropdown").val().replace(/ \/\/.*/, "")
                    let changedShowcaseIds = [showcaseId, newItem]
                    let relatedContainer = $("div#" + newItem)
                    let Related = ShowcaseInfo['summaries'][newItem]
                    let LocalItem = ShowcaseInfo['summaries'][showcaseId]
                    // console.log("Adding ", newItem, " to everyone in the group shown by ", showcaseId)
                    container.find("li.placeholder").remove()
                    container.find(".useCasesDropdown").val("")
                    if (container.find("li#" + newItem).length == 0) {

                        let relatedTile = BuildTile.build_tile(Related, false, newItem)
                        relatedTile.find(".bookmarkIcon").replaceWith($('<i class="icon-x" style="float: right; font-size: 18pt;"/>').click(function(evt) {
                            removeRelated(evt)
                        }))

                        let localTile = BuildTile.build_tile(LocalItem, false, showcaseId)
                        localTile.find(".bookmarkIcon").replaceWith($('<i class="icon-x" style="float: right; font-size: 18pt;"/>').click(function(evt) {
                            removeRelated(evt)
                        }))

                        for (let i = 0; i < container.find(".showcase-list").find("li").length; i++) {
                            // Add the new related item to all of my current related items
                            let showcaseIdToAddTo = container.find(".showcase-list").find("li")[i].id
                            changedShowcaseIds.push(showcaseIdToAddTo)
                            if ($("div#" + showcaseIdToAddTo).find("li#" + newItem).length == 0) {
                                // console.log("Adding ", newItem, "to ", showcaseIdToAddTo, container.find(".showcase-list").find("li")[i])
                                $("div#" + showcaseIdToAddTo).find("ul.showcase-list").find("li.placeholder").remove()
                                $("div#" + showcaseIdToAddTo).find("ul.showcase-list").append(relatedTile.clone())
                            }

                            // Add my related items to the new related item
                            if ($("div#" + newItem).find("li#" + showcaseIdToAddTo).length == 0) {
                                let secondRelatedTile = BuildTile.build_tile(ShowcaseInfo['summaries'][showcaseIdToAddTo], false, showcaseIdToAddTo)
                                secondRelatedTile.find(".bookmarkIcon").replaceWith($('<i class="icon-x" style="float: right; font-size: 18pt;"/>').click(function(evt) {
                                    removeRelated(evt)
                                }))
                                $("div#" + newItem).find("ul.showcase-list").append(secondRelatedTile)
                            }
                        }



                        relatedContainer.find("li.placeholder").remove()
                        for (let i = 0; i < relatedContainer.find(".showcase-list").find("li").length; i++) {
                            let relatedRelatedId = relatedContainer.find(".showcase-list").find("li")[i].id
                            changedShowcaseIds.push(relatedRelatedId)
                                // Add all of the new related item's related items (I know, I know) to my list
                            // console.log("Doing the related related - ", relatedRelatedId, relatedContainer.find(".showcase-list").find("li")[i])
                            if (container.find("li#" + relatedRelatedId).length == 0) {
                                let relatedRelatedTile = BuildTile.build_tile(ShowcaseInfo["summaries"][relatedRelatedId], false, relatedRelatedId)
                                relatedRelatedTile.find(".bookmarkIcon").replaceWith($('<i class="icon-x" style="float: right; font-size: 18pt;"/>').click(function(evt) {
                                    removeRelated(evt)
                                }))
                                // console.log("Adding ", relatedRelatedId, "to ", showcaseId)
                                container.find("ul.showcase-list").append(relatedRelatedTile)
                            }
                            // console.log("Doing the related related two - ", relatedRelatedId, showcaseId)
                            if (relatedRelatedId != showcaseId && $("div#" + relatedRelatedId).find("li#" + showcaseId).length == 0) {

                                // console.log("Adding ", showcaseId, "to ", relatedRelatedId)
                                $("div#" + relatedRelatedId).find("ul.showcase-list").append(localTile.clone())
                            }

                            // Add me to all the new related item's related items' related items? I'm lost in the woods.
                        }

                        // Add the new related item to my list
                        container.find("ul.showcase-list").append(relatedTile)



                        // Add myself to the new related item
                        $("div#" + newItem).find("ul.showcase-list").append(localTile)
                        $("div#" + newItem).find("ul.showcase-list").find("li.placeholder").remove()
                        recordChangedRelated("add", changedShowcaseIds)
                    }


                }))
                addDiv.append("<p>If you add to only this example, the selected use case while only show up when someone is looking at \"" + Summary.name + ".\" On the other hand, if you add to the entire group, it will (1) add the selected use case to \"" + Summary.name + ",\" (2) add \"" + Summary.name + "\" to the selected use case, and (3) if there are any existing related items below it will iterate through and add the selected use case to them too, creating a mesh. It usually makes sense to add to the entire group.</p>")
                related_parent.append(addDiv)
                let related = $('<ul class="showcase-list">')
                if (Summary.relatedUseCases.length > 0) {
                    for (let relatednum = 0; relatednum < Summary.relatedUseCases.length; relatednum++) {
                        var Related = ShowcaseInfo['summaries'][Summary.relatedUseCases[relatednum]];
                        if (typeof Related == "undefined") {
                            // console.log("Error! Unknown Related", Summary.relatedUseCases[relatednum])
                        } else {
                            let localTile = BuildTile.build_tile(Related, false, Summary.relatedUseCases[relatednum])
                            localTile.find(".bookmarkIcon").replaceWith($('<i class="icon-x" style="float: right; font-size: 18pt;"/>').click(function(evt) {
                                removeRelated(evt)
                            }))
                            related.append(localTile)
                        }
                    }
                } else {
                    related.append("<li class=\"placeholder\" style=\"height: 1.5em;\">No Examples</li>")
                }
                related_parent.append($('<div class="existingRelatedDiv">').append($("<h3>Existing Related Content</h3>"), related, $("<p>Note -- when removing an item, we will remove from all the related group (")))


                // Just Kidding.. few more lines..
                let Items = [];
                for (let myShowcaseName in ShowcaseInfo['summaries']) {
                    if (myShowcaseName != SummaryName) {
                        Items.push(myShowcaseName + " // " + ShowcaseInfo['summaries'][myShowcaseName]['name'])
                    }
                }
                related_parent.find(".useCasesDropdown").autocomplete({ source: Items })


                ShowcaseDiv.append(related_parent)

            }
            // Almost End Related Processing (one more line after the append)


            $("#container").append(ShowcaseDiv)


        }
        updateCount()
        $(".eventtype").click(function(event) {
            let target = $(event.target);
            let ShowcaseDiv = target.closest(".showcase");
            let SummaryName = ShowcaseDiv.attr("id")
            if (target.attr("class").indexOf("active") >= 0) {
                target.removeClass("active")
            } else {
                target.addClass("active")
            }
            let active_eventtypes = ShowcaseDiv.find("button.eventtype.active");
            let list_of_eventtypes = []

            for (let etnum = 0; etnum < active_eventtypes.length; etnum++) {
                // console.log("Got my IDs", $(active_eventtypes[etnum]).attr("id"))
                list_of_eventtypes.push($(active_eventtypes[etnum]).attr("id"))
            }
            ShowcaseDiv.addClass("completed")
            $.ajax({
                url: Splunk.util.make_full_url('/splunkd/__raw/services/customize_content'),
                type: 'POST',
                contentType: "application/json",
                async: false,
                data: JSON.stringify({ "showcaseId": SummaryName, "eventtypes": list_of_eventtypes.join("|") }),
                success: function(returneddata) {
                    bustCache(); 
                    newkey = returneddata;
                    // console.log("Got a response", returneddata);
                },
                error: function(xhr, textStatus, error) {
                    bustCache(); 
                    console.error("Error Updating!", xhr, textStatus, error);
                    triggerError(textStatus)
                }

            })
            updateCount()

        })

        function updateDataSource(showcaseId) {
            require(['jquery',
                Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/Modal.js")
            ], function($,
                Modal) {
                // Now we initialize the Modal itself
                var myModal = new Modal("modal1", {
                    title: "Adjust Data Source(s)",
                    backdrop: 'static',
                    keyboard: false,
                    destroyOnHide: true,
                    type: 'normal'
                });

                $(myModal.$el).on("show", function() {


                })
                let ShowcaseDiv = $("#" + showcaseId)
                let summary = ShowcaseInfo['summaries'][showcaseId]
                let ListOfDataSources = []
                let ActiveDataSources = []
                for (let dscId in data_inventory) {
                    ListOfDataSources.push(data_inventory[dscId]['name'])
                }
                /*for(let ShowcaseName in ShowcaseInfo['summaries']){
                    if(typeof ShowcaseInfo['summaries'][ShowcaseName]['datasource'] != "undefined"){
                        let DataSources = ShowcaseInfo['summaries'][ShowcaseName]['datasource'].split("|")
                        for(let localcount = 0 ; localcount < DataSources.length; localcount++){
                            if(ListOfDataSources.indexOf(DataSources[localcount]) == -1){
                                ListOfDataSources.push( DataSources[localcount] )
                            }
                        }
                        
                    }
                }*/
                ListOfDataSources = ListOfDataSources.sort()

                if (typeof summary.datasource != "undefined") {
                    ActiveDataSources = summary.datasource.split("|")
                }

                let buttonDiv = $("<div class=\"newdatasourcebuttons\" id=\"newsource" + showcaseId + "\">")
                for (let buttoncount = 0; buttoncount < ListOfDataSources.length; buttoncount++) {

                    let datasource = ListOfDataSources[buttoncount]
                    let addlclass = ""
                    if (ActiveDataSources.indexOf(datasource) >= 0) {
                        addlclass = " active"
                    }
                    buttonDiv.append($("<button class=\"newdatasource" + addlclass + "\" name=\"" + datasource + "\">").text(datasource))
                }
                myModal.body
                    .append(ShowcaseDiv.find("h2").first().clone(), ShowcaseDiv.find("h3").first().clone(), ShowcaseDiv.find("p").first().clone(),
                        buttonDiv);

                myModal.footer.append($('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                }).addClass('btn btn-primary').text('Close').on('click', function() {
                    // Not taking any action here
                }))
                myModal.show(); // Launch it!

                $(".newdatasource").click(function(event) {
                    let target = $(event.target);
                    let showcaseId = target.closest(".newdatasourcebuttons").attr("id").replace(/^newsource/, "")
                        // let SummaryName = ShowcaseDiv.attr("id")
                    if (target.attr("class").indexOf("active") >= 0) {
                        target.removeClass("active")
                    } else {
                        target.addClass("active")
                    }
                    let active_datasources = $("button.newdatasource.active");
                    let list_of_datasources = []

                    for (let etnum = 0; etnum < active_datasources.length; etnum++) {
                        // console.log("Got my IDs", $(active_datasources[etnum]).attr("name"))
                        list_of_datasources.push($(active_datasources[etnum]).attr("name"))
                    }
                    // console.log("Pushing New Data Sources for ", showcaseId, list_of_datasources)
                    $.ajax({
                        url: $C['SPLUNKD_PATH'] + '/services/customize_content',
                        type: 'POST',
                        contentType: "application/json",
                        async: false,
                        data: JSON.stringify({ "showcaseId": showcaseId, "datasource": list_of_datasources.join("|") }),
                        success: function(returneddata) {
                            bustCache(); 
                            newkey = returneddata;
                            // console.log("Got a response", returneddata);
                        }
                    })
                    $("#" + showcaseId).hide() // Should really refresh.. but that's harder so just go refresh it you lazy person!
                        // updateCount()

                })
            })
        }

        function SummarizeMitre(mitre_attack, mitre_preattack) {
            let master = { "attack": {}, "pre_attack": {}, "technique_master": {}, "short_name_to_tactic": {}, "allTactics": {}, "name_to_tactic": {}, "name_to_technique": {}, "technique_to_tactic": {} };
            for (let i = 0; i < mitre_attack.objects.length; i++) {
                let obj = mitre_attack.objects[i];
                if (typeof obj.external_references != "undefined") {
                    for (let g = 0; g < obj.external_references.length; g++) {
                        if (obj.external_references[g].source_name.indexOf("mitre") >= 0 && typeof obj.external_references[g].external_id != "undefined" && obj.external_references[g].external_id.indexOf("T1") == 0 && obj.type == "attack-pattern") {
                            let id = obj.external_references[g].external_id
                            master["technique_master"][id] = obj;
                            master["name_to_technique"][obj.name] = id;
                        }
                        if (obj.external_references[g].source_name.indexOf("mitre") >= 0 && typeof obj.external_references[g].external_id != "undefined" && obj.external_references[g].external_id.indexOf("TA") == 0) {
                            let id = obj.external_references[g].external_id
                            master["attack"][id] = obj;
                            master["technique_master"][id] = obj;
                            master["name_to_technique"][obj.name] = id;
                            master["technique_to_tactic"][id] = id;
                            master["allTactics"][id] = obj;
                            let techniqueBlob = {}
                            techniqueBlob[id] = { "name": "Generic " + obj.name }
                            master["attack"][id].techniques = techniqueBlob
                            master["name_to_tactic"][obj.name] = id;
                            master["short_name_to_tactic"][obj.x_mitre_shortname] = { "phase": "attack", "id": id }
                        }
                    }
                }
            }
            for (let i = 0; i < mitre_preattack.objects.length; i++) {
                let obj = mitre_preattack.objects[i];
                if (typeof obj.external_references != "undefined") {
                    for (let g = 0; g < obj.external_references.length; g++) {
                        if (obj.external_references[g].source_name.indexOf("mitre") >= 0 && typeof obj.external_references[g].external_id != "undefined" && obj.external_references[g].external_id.indexOf("T1") == 0 && obj.type == "attack-pattern") {
                            let id = obj.external_references[g].external_id
                            master["technique_master"][id] = obj;
                            master["name_to_technique"][obj.name] = id;
                        }
                        if (obj.external_references[g].source_name.indexOf("mitre") >= 0 && typeof obj.external_references[g].external_id != "undefined" && obj.external_references[g].external_id.indexOf("TA") == 0) {
                            let id = obj.external_references[g].external_id
                            master["pre_attack"][id] = obj;
                            master["technique_master"][id] = obj;
                            master["name_to_technique"][obj.name] = id;
                            master["technique_to_tactic"][id] = id;
                            master["allTactics"][id] = obj;
                            master["name_to_tactic"][obj.name] = id;
                            let techniqueBlob = {}
                            techniqueBlob[id] = { "name": "Generic " + obj.name }
                            master["pre_attack"][id].techniques = techniqueBlob
                            master["short_name_to_tactic"][obj.x_mitre_shortname] = { "phase": "pre_attack", "id": id }
                        }
                    }
                }
            }

            for (let id in master.technique_master) {
                let technique = master.technique_master[id]
                if (typeof technique.kill_chain_phases != "undefined") {
                    for (let g = 0; g < technique.kill_chain_phases.length; g++) {
                        if (technique.kill_chain_phases[g].kill_chain_name == "mitre-attack") {
                            master.attack[master.short_name_to_tactic[technique.kill_chain_phases[g].phase_name].id].techniques[id] = technique
                            if (typeof master["technique_to_tactic"][id] == "undefined") {
                                master["technique_to_tactic"][id] = []
                            }
                            master["technique_to_tactic"][id].push(master.short_name_to_tactic[technique.kill_chain_phases[g].phase_name].id);
                        } else if (technique.kill_chain_phases[g].kill_chain_name == "mitre-pre-attack") {
                            if (typeof master.short_name_to_tactic[technique.kill_chain_phases[g].phase_name] != "undefined") {

                                master.pre_attack[master.short_name_to_tactic[technique.kill_chain_phases[g].phase_name].id].techniques[id] = technique
                                if (typeof master["technique_to_tactic"][id] == "undefined") {
                                    master["technique_to_tactic"][id] = []
                                }
                                master["technique_to_tactic"][id].push(master.short_name_to_tactic[technique.kill_chain_phases[g].phase_name].id);
                            }

                        }
                    }
                }
            }

            return master;
        }

        function GenerateListOfMITRETechniques(tactic, tacticId, active_techniques) {
            let container = $("<div>")
            container.append("<h3 class=\"add_description\">Select Technique To Add</h3>")

            let techniquelist = Object.keys(tactic.techniques)
            for (let techniquenum = 0; techniquenum < techniquelist.length; techniquenum++) {
                let extraClass = ""
                if (active_techniques.indexOf(techniquelist[techniquenum]) >= 0) {
                    extraClass += " active"
                }
                name = mitre.technique_master[techniquelist[techniquenum]].name
                if (tacticId == techniquelist[techniquenum]) {
                    name = "Generic: " + name
                }
                container.append($("<button class=\"mitreTechnique " + extraClass + "\" tactic=\"" + tacticId + "\" technique=\"" + techniquelist[techniquenum] + "\">").text(name).click(function(evt) {
                    let target = $(evt.target);
                    let tacticId = target.attr("tactic")
                    let techniqueId = target.attr("technique")
                    let showcaseId = target.closest(".showcase").attr("id")
                    let container = target.closest(".showcase")
                    if (target.attr("class").indexOf("active") >= 0) {
                        // console.log("Removing", techniqueId, showcaseId)
                        target.removeClass("active")
                        var numRemaining = container.find(".mitreTechnique.active").length;


                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/services/customize_content',
                            type: 'POST',
                            contentType: "application/json",
                            async: false,
                            data: JSON.stringify({ "showcaseId": showcaseId, "action": "remove_technique", "mitre_technique": techniqueId }),
                            success: function(returneddata) {
                                bustCache(); 
                                newkey = returneddata;
                                // console.log("Got a response", returneddata);
                            },
                            error: function(xhr, textStatus, error) {
                                bustCache(); 
                                console.error("Error Updating!", xhr, textStatus, error);
                                triggerError(xhr.responseText);
                            }
                        })

                        if (numRemaining == 0) {
                            container.find(".mitreTactic[tactic=" + tacticId + "]").removeClass("active")

                            $.ajax({
                                url: $C['SPLUNKD_PATH'] + '/services/customize_content',
                                type: 'POST',
                                contentType: "application/json",
                                async: false,
                                data: JSON.stringify({ "showcaseId": showcaseId, "action": "remove_tactic", "mitre_tactic": tacticId }),
                                success: function(returneddata) {
                                    bustCache(); 
                                    newkey = returneddata;
                                    // console.log("Got a response", returneddata);
                                },
                                error: function(xhr, textStatus, error) {
                                    bustCache(); 
                                    console.error("Error Updating!", xhr, textStatus, error);
                                    triggerError(xhr.responseText);
                                }
                            })
                            if (container.find(".mitreTactic.active").length == 0) {
                                container.removeClass("completed")
                            }

                        }
                        // console.log(numRemaining, "remaining")
                    } else {

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/services/customize_content',
                            type: 'POST',
                            contentType: "application/json",
                            async: false,
                            data: JSON.stringify({ "showcaseId": showcaseId, "action": "add_technique", "mitre_tactic": tacticId, "mitre_technique": techniqueId }),
                            success: function(returneddata) {
                                bustCache(); 
                                newkey = returneddata;
                                // console.log("Got a response", returneddata);
                            },
                            error: function(xhr, textStatus, error) {
                                bustCache(); 
                                console.error("Error Updating!", xhr, textStatus, error);
                                triggerError(xhr.responseText);
                            }
                        })
                        container.addClass("completed")
                        // console.log("Adding", techniqueId, showcaseId)
                        target.addClass("active")
                        container.find(".mitreTactic[tactic=" + tacticId + "]").addClass("active")
                    }
                    updateCount()

                }))

            }
            return container
        }
        window.GenerateListOfMITRETechniques = GenerateListOfMITRETechniques

        function launchNotesWindow(target) {
            let showcaseId = target.closest(".showcase").attr("id");
            let existingNotes = ""
            if (typeof ShowcaseInfo['summaries'][showcaseId]['mitre_notes'] != "undefined") {
                existingNotes = ShowcaseInfo['summaries'][showcaseId]['mitre_notes']
            }

            require(['jquery',
                Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/Modal.js")
            ], function($,
                Modal) {
                // Now we initialize the Modal itself
                var myModal = new Modal("addNotes", {
                    title: "Add MITRE Notes",
                    backdrop: 'static',
                    keyboard: false,
                    destroyOnHide: true,
                    type: 'normal'
                });

                $(myModal.$el).on("show", function() {

                })
                myModal.body
                    .append($("<p>").text("Insert Notes Below, and click Save to record those notes for the future."), $('<textarea showcaseid="' + showcaseId + '" id="method_notes" style="width: 100%; height: 300px;"></textarea>').text(existingNotes));

                myModal.footer.append($('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                }).addClass('btn ').text('Cancel').on('click', function() {
                    // Not taking any action here
                }), $('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                }).addClass('btn btn-primary').text('Save').on('click', function() {
                    let showcaseId = $("#method_notes").attr("showcaseid");
                    let notes = $("#method_notes").val();
                    ShowcaseInfo['summaries'][showcaseId]['mitre_notes'] = notes;
                    $("div#" + showcaseId).find(".methodology-notes").text(notes)
                    $.ajax({
                        url: $C['SPLUNKD_PATH'] + '/services/customize_content',
                        type: 'POST',
                        contentType: "application/json",
                        async: false,
                        data: JSON.stringify({ "showcaseId": showcaseId, "mitre_notes": notes }),
                        success: function(returneddata) {
                            bustCache(); 
                            newkey = returneddata;
                            // console.log("Got a response", returneddata);
                        },
                        error: function(xhr, textStatus, error) {
                            bustCache(); 
                            console.error("Error Updating!", xhr, textStatus, error);
                            triggerError(xhr.responseText);
                        }
                    })
                }))
                myModal.show(); // Launch it!

            })
        }
    })

}

function updateCount() {
    $("#statusIndicator").text($(".showcase.completed").length + " / " + $(".showcase").length + " completed -- " + Math.round(10000 * $(".showcase.completed").length / $(".showcase").length) / 100 + "%")
}

function removeRelated(evt) {

    let target = $(evt.target)
    let item = target.closest("li")
    let container = target.closest(".showcase")
    let removingId = item.attr("id")
    let showcaseId = container.attr("id")
    let changedShowcaseIds = [removingId, showcaseId]
    // console.log("Removing", removingId, " from ", showcaseId)
    item.remove()
    // console.log("Looking in div#" + removingId + " for li#" + showcaseId + " and removing it...")
    if ($("div#" + removingId).find("li#" + showcaseId).length > 0) {
        $("div#" + removingId).find("li#" + showcaseId).remove()
    }
    for (let i = 0; i < container.find(".showcase-list").find("li").length; i++) {
        let showcaseIdToRemoveFrom = container.find(".showcase-list").find("li")[i].id
        changedShowcaseIds.push(showcaseIdToRemoveFrom)
        if ($("div#" + showcaseIdToRemoveFrom).find("li#" + removingId).length > 0) {
            $("div#" + showcaseIdToRemoveFrom).find("li#" + removingId).remove()
        }
    }
    recordChangedRelated("remove", changedShowcaseIds)

}

function recordChangedRelated(action, showcaseIds) {
    showcaseIds = Array.from(new Set(showcaseIds));
    let obj = {}
    for (let i = 0; i < showcaseIds.length; i++) {
        let showcaseId = showcaseIds[i]
        obj[showcaseId] = []
        for (let i = 0; i < $("div#" + showcaseId).find("ul.showcase-list").find("li").length; i++) {
            obj[showcaseId].push($("div#" + showcaseId).find("ul.showcase-list").find("li")[i].id)
        }
    }
    // console.log(action, " for ", showcaseIds, obj);

    $.ajax({
        url: $C['SPLUNKD_PATH'] + '/services/customize_content',
        type: 'POST',
        contentType: "application/json",
        async: false,
        data: JSON.stringify({ "relatedRecords": obj, "action": "change_related_items" }),
        success: function(returneddata) {
            bustCache(); 
            newkey = returneddata;
            // console.log("Got a response", returneddata);
        },
        error: function(xhr, textStatus, error) {
            bustCache(); 
            console.error("Error Updating!", xhr, textStatus, error);
            triggerError(xhr.responseText);
        }
    })
}