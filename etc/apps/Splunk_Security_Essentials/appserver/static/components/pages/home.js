'use strict';

localStorage['sse-newUserRun'] = "New"
require(
    [
        'jquery',
        'underscore',
        'backbone',
        // 'json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=usecases&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=intro&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config',
        "splunk.util",
        'components/data/health_checks',
        "bootstrap.tooltip",
        "bootstrap.popover"
    ],
    function(
        $,
        _,
        Backbone,
        // ShowcaseInfo,
        UseCases,
        PageGuides,
        appConfig,
        splunkUtil
    ) {

        // Help while building out the page -- let's look through all nextFeature, nextFeatures, prereqs, and other_recommended_features and look for any not defined.
        let listOfRequiredFeatures = {}
        let listOfRelevantFields = ["nextFeature", "nextFeatures", "prereqs", "other_recommended_features"];
        for(let PageGuide in PageGuides['PageGuides']){
            // console.log("Looking", PageGuide)
            for(let Item in PageGuides['PageGuides'][PageGuide]['items']){
                // console.log("Looking", Item)
                for(let i = 0; i < listOfRelevantFields.length; i++){
                    if(PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ]){
                        // console.log("Looking for", listOfRelevantFields[i], PageGuide, Item, PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ])
                        if(typeof PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ] == "string"){
                            if(! listOfRequiredFeatures[ PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ] ]){
                                listOfRequiredFeatures[ PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ] ] = []
                            }
                            listOfRequiredFeatures[ PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ] ].push(Item)
                        }else{
                            for(let g = 0; g < PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ].length; g++){
                                if(! listOfRequiredFeatures[ PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ][g] ]){
                                    listOfRequiredFeatures[ PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ][g] ] = []
                                }
                                listOfRequiredFeatures[ PageGuides['PageGuides'][PageGuide]['items'][Item][ listOfRelevantFields[i] ][g] ].push(Item)
                            }
                        }
                    }
                }
            }
        }
        for(let Feature in PageGuides['Features']){
            if(listOfRequiredFeatures[Feature]){
                delete listOfRequiredFeatures[Feature]
            }
        }
        // console.log("MISSING FEATURES", listOfRequiredFeatures)

        let demoMode = "uninitialized";
        let demoModeInputSetting = ''
        for(let i = 0; i < appConfig.length; i++){
            if(appConfig[i].param == "demoMode"){
                demoMode = appConfig[i].value
            }
        }
        if(demoMode == "uninitialized"){
            demoMode = "false";
            setAppConfig("demoMode", "false")
        }
        if(demoMode == "true"){
            demoModeInputSetting = ' checked'
        }
        $("#DemoModeSwitch").html('<div class="tooltipcontainer  filterItem" style="margin-right: 45px;"><label class="filterswitch floatright" style="margin-left: 8px;">' /* + tooltipText*/ + '<input type="checkbox" id="FILTER_DEMOMODE" name="FILTER_DEMOMODE" ' + demoModeInputSetting + '><span class="filterslider "></span></label><div class="filterLine">Demo Mode <a href=\"#\" data-placement=\"bottom\" onclick=\"return false;\" class=\"icon-info\" title=\"SPL is hidden by default and <br />demo searches show up first.\"> </a></div></div> ').click(function(evt){
            let setting = $(evt.target).is(":checked");
            if(setting){
                setAppConfig("demoMode", "true")
            }else{
                setAppConfig("demoMode", "false")
            }
        });
        $("#DemoModeSwitch").find("a").tooltip({ html: 'true' })
        $("#processing").html('<div></div>');

        //These are helper functions for the lines
        var lines = {}
        function hideLines() {
            //console.log("inside hidelines")
            $.each(lines, function( intValue, lineGroup ) {
                    $.each(lineGroup[0], function( intValue2, line ) {
                        if (typeof line.hide != 'undefined' && $.isFunction(line.hide)) {
                            line.hide()
                        }

                    });
            });
        }

        function refreshLinePositions() {
            $.each(lines, function( intValue, lineGroup ) {
                    $.each(lineGroup[0], function( intValue2, line ) {
                        if (typeof line.hide !== 'undefined' && $.isFunction(line.hide)) {
                            line.position()
                        }

                    });
            });
        }

        function showLineGroup(group) {
            if (typeof(lines[group]) != "undefined") {
                $.each(lines[group][0], function( intValue, line ) {
                    if (typeof line.show !== 'undefined' && $.isFunction(line.show)) {
                        line.show()
                    }
                });
                refreshLinePositions()
            }
        }

        function createLineGroup(start) {
            lines[start] = []
            lineGroup = []
            $("#"+start+"_drilldown a").each(function(idx, PageGuideDrillDown) {
                       end=$(PageGuideDrillDown).attr("id")
                        line = new LeaderLine(document.getElementById(start), document.getElementById(end), {hide: false,path: 'grid', startSocket: 'bottom', endSocket: 'top',positionByWindowResize: 'false',color: 'rgba(0, 110, 170,1)'});
                        lineGroup.push(line)
            })
            lines[start].push(lineGroup)
            //console.log("Just created line group")
            //console.log(lines)
        }
        function createLine(start,end) {
                //console.log("inside createLine:"+start+" -> "+end)
                lines[start] = []
                lineGroup = []
                line = new LeaderLine(document.getElementById(start), document.getElementById(end), {hide: false,path: 'grid', startSocket: 'bottom', endSocket: 'top',positionByWindowResize: 'false',color: 'rgba(0, 110, 170,1)'});
                lineGroup.push(line)
                //console.log("Just created line")
                lines[start].push(lineGroup)
        }


        //This adds the first time entry boxes with bullet points

        let sorted_PageGuides = Object.keys(PageGuides['PageGuides']).filter(function(PageGuide){ return (PageGuides['PageGuides'][PageGuide]['enabled']) });
        sorted_PageGuides.sort(function(a, b){
            if(PageGuides['PageGuides'][a].order > PageGuides['PageGuides'][b].order)
                return 1
            if(PageGuides['PageGuides'][a].order < PageGuides['PageGuides'][b].order)
                return -1
            return 0;
        })
        sorted_PageGuides.forEach(function(PageGuide) {
            let icon = ""
            if(PageGuides['PageGuides'] && PageGuides['PageGuides'][PageGuide] && PageGuides['PageGuides'][PageGuide]['icon']){
                icon = "<img src=\"" + PageGuides['PageGuides'][PageGuide]['icon'] + "\" />"
            }
            if(! (PageGuides['PageGuides'] && PageGuides['PageGuides'][PageGuide] && PageGuides['PageGuides'][PageGuide]['name'])){
                // console.log("Skipping this use case", UseCases[UseCase])

            }else{
                var PageGuideItemListItem="";
                let addlClass = "";
                let title=""
                if(localStorage["sse-pageGuide-toplevel"] && localStorage["sse-pageGuide-toplevel"] == PageGuide){
                    addlClass = "lastSelected"
                    title="You selected this last time you viewed this page."
                }

                let sorted_Items = Object.keys(PageGuides['PageGuides'][PageGuide]["items"]).filter(function(item){ return (PageGuides['PageGuides'][PageGuide]["items"][item]['enabled']) })
                sorted_Items.sort(function(a, b){
                    if(PageGuides['PageGuides'][PageGuide]["items"][a].order > PageGuides['PageGuides'][PageGuide]["items"][b].order)
                        return 1
                    if(PageGuides['PageGuides'][PageGuide]["items"][a].order < PageGuides['PageGuides'][PageGuide]["items"][b].order)
                        return -1
                    return 0;
                })
                $("#ListOfPageGuidesFirstEntry").append(
                    $("<a class=\"PageGuide CardStyles\">").attr("title", title).addClass(addlClass).attr("id","firstentry_"+PageGuide).click(function() {
                                $(".lastSelected").attr("title", "").tooltip({ html: 'true' })
                                $(".lastSelected").removeClass("lastSelected");

                                //lineGroup=this.id.split("firstentry_")[1]
                                $("#"+PageGuide).addClass("active");
                                $("#ListOfPageGuidesFirstEntry").hide( "300")

                                //$("#ListOfPageGuides").show(300);
                                $("#ListOfPageGuides").fadeIn(300).css('display', 'flex');
                                $("#ListOfPageGuides").addClass("activated");
                                $("div#" + PageGuide + "_drilldown").fadeIn(300).css('display', 'inline-block');

                                setTimeout(function(){
                                if(localStorage["sse-pageGuide-bottomlevel"] && $("#" + localStorage["sse-pageGuide-bottomlevel"] + ":visible").length > 0){
                                    $("#" + localStorage["sse-pageGuide-bottomlevel"]).click()
                                }else{

                                        createLineGroup(PageGuide)

                                }
                                },400)
                                sendTelemetryForIntro("browse", PageGuide);
                                setLocalStorage(PageGuide);
                    }).append(
                        $("<div class=\"BodyStyles\">").append(
                            $("<div class=\"PageGuideImg\">" + icon + "</div>"),
                            $("<div class=\"PageGuideDescription\">").attr("data-id", PageGuide).append(
                               $("<h2 class=\"HeadingStyles\">").append(
                                    PageGuides['PageGuides'][PageGuide]['name']
                                ),
                                sorted_Items.forEach(function(PageGuideItem) {
                                        PageGuideItemListItem+="<li>" + PageGuides['PageGuides'][PageGuide]["items"][PageGuideItem]["name"] + "</li>"
                                }),
                                $("<p class=\"ParagraphStyles\">" + PageGuides['PageGuides'][PageGuide]['description']).append(
                                    $("<ul>").append(
                                        PageGuideItemListItem
                                    )
                                ),
                            )
                        )
                    )
                )
                if(addlClass != ""){
                    $(".lastSelected").tooltip({ html: 'true' })
                }

            }

        })


        //This controls the first level of boxes after you've clicked through the firsts entry
        sorted_PageGuides.forEach(function(PageGuide) {
            let icon = ""
            if(PageGuides['PageGuides'] && PageGuides['PageGuides'][PageGuide] && PageGuides['PageGuides'][PageGuide]['icon']){
                icon = "<img src=\"" + PageGuides['PageGuides'][PageGuide]['icon'] + "\" />"
            }
            if(! (PageGuides['PageGuides'] && PageGuides['PageGuides'][PageGuide] && PageGuides['PageGuides'][PageGuide]['name'])){
                // console.log("Skipping this use case", UseCases[UseCase])

            }else{
                var PageGuideItemListItem="";
                $("#ListOfPageGuides").append(
                    $("<a id=\"" + PageGuide + "\" class=\"PageGuide CardStyles\">").click(function() {
                                $(".DrillDownBox").hide();
                                $(".ContentBox").hide();
                                $(".PageGuide").removeClass("active");
                                $(".PageGuide2").removeClass("active");
                                $("#PageGuideDrilldown").removeClass("activated");
                                $("div#" + this.id + "_drilldown").css('display', 'inline-block');
                                $(this).addClass("active");
                                $(this).parent().addClass("activated");
                                hideLines()
                                createLineGroup(this.id)
                                $("#PageGuideDrillDownTitle").html("<h2 class=\"HeadingStyles\">"+PageGuides['PageGuides'][PageGuide]['name']+"</h2>");
                                //$("#PageGuideDrillDownTitle").show();
                                $("#PageGuideContent").hide();
                                sendTelemetryForIntro("browse", PageGuide);
                                setLocalStorage(PageGuide);
                            }).append(
                        $("<div class=\"BodyStyles\">").append(
                            $("<div class=\"PageGuideImg\">" + icon + "</div>"),
                            $("<div class=\"PageGuideDescription\">").attr("data-id", PageGuide).append(
                                $("<h2 class=\"HeadingStyles\">").append(
                                    PageGuides['PageGuides'][PageGuide]['name']
                                )
                            )
                        )
                    )
                )
                //This controls the second level of boxeslet sorted_PageGuides = Object.keys(PageGuides['PageGuides']);
                let sorted_Items = Object.keys(PageGuides['PageGuides'][PageGuide]["items"]).filter(function(item){ return (PageGuides['PageGuides'][PageGuide]["items"][item]['enabled']) })
                sorted_Items.sort(function(a, b){
                    if(PageGuides['PageGuides'][PageGuide]["items"][a].order > PageGuides['PageGuides'][PageGuide]["items"][b].order)
                        return 1
                    if(PageGuides['PageGuides'][PageGuide]["items"][a].order < PageGuides['PageGuides'][PageGuide]["items"][b].order)
                        return -1
                    return 0;
                })
                sorted_Items.forEach(function(PageGuideItem) {
                    $("#PageGuideDrilldown").append(
                        $("<div id=\"" + PageGuide + "_drilldown\" class=\"DrillDownBox\">").append(
                            $("<a id=\"" + PageGuideItem + "\" class=\"PageGuide2 CardStyles\">").click(function(evt) {
                                // console.log("Got a click on ", evt.target)
                                        $(".DrillDownBox2").hide();
                                        $(".PageGuide2").removeClass("active");
                                        $("div#" + this.id + "_drilldown").css('display', 'inline-block');
                                        $(this).addClass("active");
                                        $(this).parent().parent().addClass("activated");
                                        $(".ContentBox").hide();
                                        $("div#" + this.id + "_contentbox").css('display', 'inline-block');
                                        $("#PageGuideContent").show();
                                        start=$(this).parent().attr("id").split("_drilldown")[0]
                                        end=this.id
                                        hideLines()
                                        createLine(start,end)
                                        // $("div#" + this.id + "_contentbox").append()
                                        sendTelemetryForIntro("browse", PageGuide, PageGuides['PageGuides'][PageGuide]["items"][PageGuideItem]["name"]);
                                        setLocalStorage(PageGuide, PageGuideItem);
                                        loadPageGuideContent($("div#" + this.id + "_contentbox").find(".page_guide_detail"), PageGuides['PageGuides'][PageGuide]["items"][PageGuideItem])
                                    }).append(
                                    $("<div class=\"BodyStyles\">").append(
                                        $("<div class=\"PageGuideImg\">" + icon + "</div>"),
                                        $("<div class=\"PageGuideDescription\">").attr("data-id", PageGuideItem).append(
                                            $("<h2 class=\"HeadingStyles\">").append(
                                                PageGuides['PageGuides'][PageGuide]["items"][PageGuideItem]["name"]
                                            )
                                        )
                                    )
                            )
                        )
                    ),
                        //This controls the third level with the details
                    $("#PageGuideContent").append(
                         $("<div id=\"" + PageGuideItem + "_contentbox\" class=\"ContentBox\">").append(
                             $("<h2 class=\"HeadingStyles\">").append(
                                                PageGuides['PageGuides'][PageGuide]["items"][PageGuideItem]["name"]
                             ),
                             PageGuides['PageGuides'][PageGuide]["items"][PageGuideItem]["description"],
                             $('<div class="page_guide_detail">')
                         )
                    )

                })


            }

        })

        function setLocalStorage(toplevel, bottomlevel){
            localStorage["sse-pageGuide-toplevel"] = toplevel;
            if(bottomlevel){
                localStorage["sse-pageGuide-bottomlevel"] = bottomlevel;
            }

        }

        function takeAction(nextFeature, actions, overrides, tour){
            // console.log("Initiating action", nextFeature, actions, overrides)
            sendTelemetryForIntro("click", localStorage['sse-pageGuide-toplevel'], localStorage['sse-pageGuide-bottomlevel'], overrides)
            let demoModeInstruction = false;
            // console.log("Got next")
            if(actions){
                for(let i = 0; i < actions.length; i++){
                    if(actions[i].param.indexOf("-splMode")>=0){
                        demoModeInstruction = true
                    }
                    localStorage[actions[i].param] = actions[i].value
                }
            }
            if(overrides){
                for(let i = 0; i < overrides.length; i++){
                    if(overrides[i].param.indexOf("-splMode")>=0){
                        demoModeInstruction = true
                    }
                    // console.log("Overriding", overrides[i].param, overrides[i].value)
                    localStorage[overrides[i].param] = overrides[i].value
                }
            }
            if(! demoModeInstruction){
                if(demoMode == "true"){
                    localStorage[localStoragePreface + '-splMode'] = "false"
                }else{
                    localStorage[localStoragePreface + '-splMode'] = "true"
                }
                
            }
            if(tour){
                if(PageGuides['Features'][nextFeature]['link']){
                    location.href=PageGuides['Features'][nextFeature]['link']  + "?tour=" + nextFeature.replace(/[^a-zA-Z0-9_\-]/g, "") + "-tour"
                }else{
                    location.href="home?tour=" + nextFeature.replace(/[^a-zA-Z0-9_\-]/g, "") + "-tour"
                }
                
            }else{
                location.href=PageGuides['Features'][nextFeature]['link'] 
            }
            
        }
        function loadPageGuideContent($el, item){
            // console.log("loading", item)
            // $(".page_guide_detail").each(function(num, obj){
            //     $(obj).html("")
            // })
            // $(".pageGuideActions").remove()
            let myDiv = $('<div class="pageGuideActions" style="padding-top: 10px;">')



            // First Handle Pre-reqs
            if(item.prereqs && item.prereqs.length > 0){
                let myId = item.name.replace(/[^a-zA-Z_]/g, "") + "_prereqs"
                let Template = "<table id=\"SHORTNAME_table\" class=\"dvexpand table table-chrome\"><colgroup><col span=\"1\" style=\"width: 30px\" /><col span=\"1\" style=\"width: 200px\" /><col span=\"1\" style=\"width: 120px\" /><col span=\"1\"  /></colgroup><thead><tr><th colspan=\"NUMCOLUMNS\" class=\"expands\"  onclick='$(\"#SHORTNAME-tbody\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#SHORTNAME_table\").addClass(\"expanded\"); $(\"#SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#SHORTNAME_table\").removeClass(\"expanded\");  $(\"#SHORTNAME_table\").addClass(\"table-chrome\"); } return false;'><h2 style=\"display: inline; line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\">&nbsp;&nbsp;<i id=\"SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE <div style=\"display: inline;\" id=\"SHORTNAME_statusIcon\" /></a></h2> <label style=\"display: inline;\" for=\"SHORTNAME_statusIcon\">DESCRIPTION</label> <div id=\"SHORTNAME_status\" style=\"float: right\"></div></th></tr></thead><tbody style=\"display: none\" id=\"SHORTNAME-tbody\"></tbody></table>"
                myDiv.append(Template.replace(/SHORTNAME/g, myId ).replace("TITLE", "Setup Steps" ).replace("DESCRIPTION", _("Completion of these steps is required to get the value for this area.").t()).replace("NUMCOLUMNS", "4"))

                for(let i = 0; i < item.prereqs.length; i++){
                    myDiv.find("#" + myId + "-tbody").append(generateFeatureRow(item.prereqs[i]))
                }

                myDiv.append($("<div style=\"clear: both; height: 20px; margin: 10px\"/>"))
            }

            // Then handle button
            if(item.nextFeature){
                let newPageName = ""
                if(item.nextFeature && PageGuides['Features'][item.nextFeature] && PageGuides['Features'][item.nextFeature].name){
                    newPageName = ": " + PageGuides['Features'][item.nextFeature].name
                }
                if(item.localStorageActions && item.localStorageActions.length > 0){
                    let tooltipText = _("We will automatically set the following configurations locally on your browser. All of these can be changed on the next page, but the defaults should make this app easier to use:").t();
                    tooltipText += "<ul>"
                    for(let i = 0; i < item.localStorageActions.length; i++){
                        if(item.localStorageActions[i].description && item.localStorageActions[i].description!=""){
                            tooltipText += "<li>" + item.localStorageActions[i].description + "</li>"
                        }

                    }
                    tooltipText += "</ul>"
                    
                    myDiv.append(
                        $("<button>").attr("data-placement", "top").attr("data-toggle", "popover").attr("data_trigger", "hover").attr("data-content", tooltipText).attr("title", tooltipText).text(_("Launch").t() + newPageName ).addClass("launch-button btn btn-primary").attr("data-actions", JSON.stringify(item.localStorageActions)).click(function(evt){
                            let actions = JSON.parse($(evt.target).attr("data-actions"))
                            takeAction(item.nextFeature, actions)
                        })
                    )
                    // console.log("Looking for a tour in ", item.nextFeature, PageGuides['Features'][item.nextFeature], PageGuides['Features'][item.nextFeature].tour)
                    if(PageGuides['Features'][item.nextFeature].tour && PageGuides['Features'][item.nextFeature].tour.length > 1){
                        myDiv.append(
                            $("<button>").attr("data-placement", "top").attr("data-toggle", "popover").attr("data_trigger", "hover").attr("data-content", tooltipText).attr("title", tooltipText).text(_("Launch with Tour").t()).addClass("launch-button btn").attr("data-actions", JSON.stringify(item.localStorageActions)).click(function(evt){
                                let actions = JSON.parse($(evt.target).attr("data-actions"))
                                takeAction(item.nextFeature, actions, null, true)
                            })
                        )
                        
                    }

                }else{
                    let tooltipText = PageGuides['Features'][item.nextFeature].description
                    myDiv.append(
                        
                        $("<button>").attr("data-placement", "top").attr("data-toggle", "popover").attr("data_trigger", "hover").attr("data-content", tooltipText).attr("title", tooltipText).addClass("launch-button btn btn-primary").text(_("Launch").t() + newPageName).click(function(){
                        if(demoMode == "true"){
                            localStorage[localStoragePreface + '-splMode'] = "false"
                        }else{
                            localStorage[localStoragePreface + '-splMode'] = "true"
                        }
                        takeAction(item.nextFeature)
                        
                    }))

                    // console.log("Looking for a tour in ", item.nextFeature, PageGuides['Features'][item.nextFeature], PageGuides['Features'][item.nextFeature].tour)
                    if(PageGuides['Features'][item.nextFeature].tour && PageGuides['Features'][item.nextFeature].tour.length > 1){
                        myDiv.append(
                            $("<button>").text(_("Launch with Tour").t()).addClass("launch-button btn").click(function(evt){
                                takeAction(item.nextFeature, null, null, true)
                            })
                        )
                        
                    }
                }
            }

            // Handle a list of next features
            if(item.nextFeatures){
                let label = _("Launch Feature").t();
                if(item.nextFeatures.length > 1){
                    label = _("Launch Features").t();
                }
                let myId = item.name.replace(/[^a-zA-Z_]/g, "") + "_next_steps"
                let Template = "<table id=\"SHORTNAME_table\" class=\"dvexpand table table-chrome\"><colgroup><col span=\"1\" style=\"width: 30px\" /><col span=\"1\" style=\"width: 200px\" /><col span=\"1\" style=\"width: 120px\" /><col span=\"1\" /></colgroup><thead><tr><th colspan=\"NUMCOLUMNS\" class=\"expands\"  onclick='$(\"#SHORTNAME-tbody\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#SHORTNAME_table\").addClass(\"expanded\"); $(\"#SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#SHORTNAME_table\").removeClass(\"expanded\");  $(\"#SHORTNAME_table\").addClass(\"table-chrome\"); } return false;'><h2 style=\"display: inline; line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\">&nbsp;&nbsp;<i id=\"SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE <div style=\"display: inline;\" id=\"SHORTNAME_statusIcon\" /></a></h2> <label style=\"display: inline;\" for=\"SHORTNAME_statusIcon\">DESCRIPTION</label> <div id=\"SHORTNAME_status\" style=\"float: right\"></div></th></tr></thead><tbody style=\"display: none\" id=\"SHORTNAME-tbody\"></tbody></table>"
                myDiv.append(Template.replace(/SHORTNAME/g, myId ).replace("TITLE", label ).replace("DESCRIPTION", _("").t()).replace("NUMCOLUMNS", "4"))

                for(let i = 0; i < item.nextFeatures.length; i++){
                    myDiv.find("#" + myId + "-tbody").append(generateFeatureRow(item.nextFeatures[i], item.localStorageActions))
                }

                myDiv.append($("<div style=\"clear: both; height: 20px; margin: 10px\"/>"))
            }

            // Use Case List
            if(item.useUseCaseList){
                let myId = item.name.replace(/[^a-zA-Z_]/g, "") + "_usecases"
                let Template = "<table id=\"SHORTNAME_table\" class=\"dvexpand table table-chrome\"><colgroup><col span=\"1\" style=\"width: 30px\" /><col span=\"1\" style=\"width: 200px\" /><col span=\"1\" style=\"width: 120px\" /><col span=\"1\" /></colgroup><thead><tr><th colspan=\"NUMCOLUMNS\" class=\"expands\"  onclick='$(\"#SHORTNAME-tbody\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#SHORTNAME_table\").addClass(\"expanded\"); $(\"#SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#SHORTNAME_table\").removeClass(\"expanded\");  $(\"#SHORTNAME_table\").addClass(\"table-chrome\"); } return false;'><h2 style=\"display: inline; line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\">&nbsp;&nbsp;<i id=\"SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE <div style=\"display: inline;\" id=\"SHORTNAME_statusIcon\" /></a></h2> <label style=\"display: inline;\" for=\"SHORTNAME_statusIcon\">DESCRIPTION</label> <div id=\"SHORTNAME_status\" style=\"float: right\"></div></th></tr></thead><tbody style=\"display: none\" id=\"SHORTNAME-tbody\"></tbody></table>"
                myDiv.append(Template.replace(/SHORTNAME/g, myId ).replace("TITLE", _("Launch Content").t() ).replace("DESCRIPTION", _("Clicking a use case below will bring you to the Security Content page.").t()).replace("NUMCOLUMNS", "1"))

                // let CountByUseCase = new Object;
                // Object.keys(ShowcaseInfo.summaries).forEach(function(ShowcaseName) {
                //     let ShowcaseSettings = ShowcaseInfo['summaries'][ShowcaseName]
                //     if(ShowcaseSettings['usecase']){
                //         let UseCases = ShowcaseSettings['usecase'].split("|")
                //         UseCases.forEach(function(UseCase) {
                //             if (typeof CountByUseCase[UseCase] == "undefined")
                //                 CountByUseCase[UseCase] = 0
                //             CountByUseCase[UseCase]++
                //         })
                //     }
                // })

                let keysInOrder = Object.keys(UseCases).filter(function(item){ return UseCases[item].enable; });

                keysInOrder.sort(function(a, b) {
                    if((! UseCases[a] || ! UseCases[a].order) && (! UseCases[b] || ! UseCases[b].order)){
                        return 0;
                    }
                    if((UseCases[a] && UseCases[a].order) &&  (! UseCases[b] || ! UseCases[b].order)){
                        return 1;
                    }
                    if((! UseCases[a] || ! UseCases[a].order) &&  ( UseCases[b] && UseCases[b].order)){
                        return -1;
                    }
                    if (UseCases[a].order > UseCases[b].order) {
                        return 1;
                    }
                    if (UseCases[a].order < UseCases[b].order) {
                        return -1;
                    }
                    return 0;
                });

                keysInOrder.forEach(function(UseCase) {
                    let icon = ""
                    if(UseCases && UseCases[UseCase] && UseCases[UseCase]['icon']){
                        icon = "<img src=\"" + UseCases[UseCase]['icon'] + "\" />"
                    }
                    if(! (UseCases && UseCases[UseCase] && UseCases[UseCase]['name'])){
                        // console.log("Skipping this use case", UseCases[UseCase])
                        
                    }else{

                        myDiv.find("#" + myId + "-tbody").append(
                            $("<div class=\"UseCase\">").append(
                                $("<div class=\"UseCaseImg\">" + icon + "</div>"),
                                $("<div class=\"UseCaseDescription\">").append(
                                    $("<h2>").append(
                                        $("<a href=\"#\"> " + UseCases[UseCase]['name'] + "</a>").click(function() {
                                            //sendTelemetryForIntro(UseCase);
                                            //setLocalStorage(UseCase);
                                            let params = [{"param": "sse-usecase-Multiple", "value": "[\"" + UseCases[UseCase]['name'].replace(/ /g, "_") + "\"]"}]
                                            if(UseCases[UseCase]['name'].replace(/ /g, "_") == "SOC_Automation"){
                                                params.push({"param": "sse-journey-Multiple", "value": "[\"Stage_1\",\"Stage_2\",\"Stage_3\",\"Stage_4\",\"Stage_5\"]"});
                                            }
                                            takeAction("contents", item.localStorageActions, params)
                                            return false;
                                        })
                                    ),
            
                                    // $("<h4>" + Splunk.util.sprintf(_("Featuring %s Examples!").t(), CountByUseCase[UseCase]) + "</h4>"),
                                    $("<p>" + UseCases[UseCase]['description'] + "</p>")
                                )
                            )
                        )
                    }
                    
                })
            }

            // Then handle Other Recommendations
            if(item.other_recommended_features && item.other_recommended_features.length > 0){
                myDiv.append($("<div style=\"clear: both; height: 20px; margin: 10px\"/>"))
                let myId = item.name.replace(/[^a-zA-Z_]/g, "") + "_additional_steps"
                let Template = "<table id=\"SHORTNAME_table\" class=\"dvexpand table table-chrome\"><colgroup><col span=\"1\" style=\"width: 30px\" /><col span=\"1\" style=\"width: 200px\" /><col span=\"1\" style=\"width: 120px\" /><col span=\"1\" /></colgroup><thead><tr><th colspan=\"NUMCOLUMNS\" class=\"expands\"  onclick='$(\"#SHORTNAME-tbody\").toggle(); if($(\"#SHORTNAME_arrow\").attr(\"class\")==\"icon-chevron-right\"){$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-down\"); $(\"#SHORTNAME_table\").addClass(\"expanded\"); $(\"#SHORTNAME_table\").removeClass(\"table-chrome\");  $(\"#SHORTNAME_table\").find(\"th\").css(\"border-top\",\"1px solid darkgray\");  }else{$(\"#SHORTNAME_arrow\").attr(\"class\",\"icon-chevron-right\");  $(\"#SHORTNAME_table\").removeClass(\"expanded\");  $(\"#SHORTNAME_table\").addClass(\"table-chrome\"); } return false;'><h2 style=\"display: inline; line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;\"><a href=\"#\" class=\"dropdowntext\" style=\"color: black;\">&nbsp;&nbsp;<i id=\"SHORTNAME_arrow\" class=\"icon-chevron-right\"></i> TITLE <div style=\"display: inline;\" id=\"SHORTNAME_statusIcon\" /></a></h2> <label style=\"display: inline;\" for=\"SHORTNAME_statusIcon\">DESCRIPTION</label> <div id=\"SHORTNAME_status\" style=\"float: right\"></div></th></tr></thead><tbody style=\"display: none\" id=\"SHORTNAME-tbody\"></tbody></table>"
                myDiv.append(Template.replace(/SHORTNAME/g, myId ).replace("DESCRIPTION", (item.other_recommended_text || "")).replace("TITLE", "Other Recommendations" ).replace("NUMCOLUMNS", "4"))

                for(let i = 0; i < item.other_recommended_features.length; i++){
                    let myRow = generateFeatureRow(item.other_recommended_features[i])
                    // console.log("Working on feature", item.other_recommended_features[i], "got", myRow.html())
                    myDiv.find("#" + myId + "-tbody").append(myRow)
                }

            }
            // $(".pageGuideActions").remove()
            // $(".page_guide_detail:visible").append(myDiv)
            window.dvtest = myDiv
            $el.html(myDiv)
            $(".launch-button").tooltip({ html: 'true' })
            if($("#" + item.name.replace(/[^a-zA-Z_]/g, "") + "_prereqs_table").find("a").length > 0){
                $("#" + item.name.replace(/[^a-zA-Z_]/g, "") + "_prereqs_table").find("a").first().click()
            }
            if($("#" + item.name.replace(/[^a-zA-Z_]/g, "") + "_next_steps_table").find("a").length > 0){
                $("#" + item.name.replace(/[^a-zA-Z_]/g, "") + "_next_steps_table").find("a").first().click()
            }
            if($("#" + item.name.replace(/[^a-zA-Z_]/g, "") + "_usecases_table").find("a").length > 0){
                $("#" + item.name.replace(/[^a-zA-Z_]/g, "") + "_usecases_table").find("a").first().click()
            }

        }
        function generateFeatureRow(rowdata, localStorageActions){
            // console.log("Hi There", rowdata, PageGuides['Features'][ rowdata ])
            let icon = $("<span>")
            let name = $("<a>")
            let tour = $("<span>")
            let description = $("<span>")

            if(PageGuides['Features'][rowdata].type == "pageguide"){
                name.attr("data-id", PageGuides['Features'][rowdata].id).click(function(evt){
                    if($("#" + $(evt.target).attr("data-id")).is(":visible")){
                        $("#" + $(evt.target).attr("data-id")).click()
                    }else{
                        for(let PageGuide in PageGuides['PageGuides']){
                            if(PageGuides['PageGuides'][PageGuide]['items'][$(evt.target).attr("data-id")]){
                                localStorage['sse-pageGuide-bottomlevel'] = $(evt.target).attr("data-id")
                                $("div[data-id=" + PageGuide + "]").click()
                            }
                        }
                    }
                    return true;
                }).text(PageGuides['Features'][rowdata].name)
            }
            if( PageGuides['Features'][ rowdata ].tour && PageGuides['Features'][ rowdata ].tour.length > 1){
                tour = name.clone();
                tour.text("Launch w/ tour")   
                tour.click(function(){
                    takeAction(rowdata, localStorageActions, null, true)
                })
            }
            if(localStorageActions){
                name.click(function(){
                    takeAction(PageGuides['Features'][rowdata].link, localStorageActions)
                })
            }else{
                name.click(function(){
                    takeAction(PageGuides['Features'][rowdata].link)
                })
            }
            

            if(PageGuides['Features'][rowdata].iconObj){
                icon.html(PageGuides['Features'][rowdata].iconObj)
            }else if(PageGuides['Features'][rowdata].type == "link"){
                icon.html( '<i style="font-size: 18pt;" class="icon-external" />')
            }else if(PageGuides['Features'][rowdata].type == "dashboard"){
                icon.html( '<i style="font-size: 18pt;" class="icon-dashboard" />')
            }else if(PageGuides['Features'][rowdata].type == "pageguide"){
                icon.html( '<i style="font-size: 18pt;" class="icon-distributed-environment" />')
            }
            
            if(PageGuides['Features'][rowdata].name  && PageGuides['Features'][rowdata].name !=""){
                name.text(_("Launch").t() + ": " + PageGuides['Features'][rowdata].name)
            }
            
            if(PageGuides['Features'][rowdata].description  && PageGuides['Features'][rowdata].description !=""){
                description.text(PageGuides['Features'][rowdata].description)
            }

            if( PageGuides['Features'][ rowdata ].type=="setup"){
                name = PageGuides['Features'][rowdata].linkObj;
            }
            return $("<tr>").append(
                $("<td>").append(icon),
                $("<td>").append(name),
                $("<td>").append(tour),
                $("<td>").append(description ))



            // if( PageGuides['Features'][ rowdata ].type=="setup"){
            //     name = $("<span>")
            //     icon.html( PageGuides['Features'][ rowdata ]['iconObj'] )
            //     name.html( PageGuides['Features'][ rowdata ]['displayObj'] )
            //     separator = $("<br/>")
            // }else if(PageGuides['Features'][rowdata].type == "link"){
            //     icon.html( '<i style="font-size: 18pt;" class="icon-external" />')
            //     name.click(function(){ location.href = PageGuides['Features'][rowdata].link}).text(PageGuides['Features'][rowdata].name)
            // }else if(PageGuides['Features'][rowdata].type == "dashboard"){
            //     icon.html( '<i style="font-size: 18pt;" class="icon-dashboard" />')
            //     name.click(function(){ location.href = PageGuides['Features'][rowdata].link}).text(PageGuides['Features'][rowdata].name)
            // }else if(PageGuides['Features'][rowdata].type == "pageguide"){
            //     icon.html( '<i style="font-size: 18pt;" class="icon-distributed-environment" />')
            //     name.attr("data-id", PageGuides['Features'][rowdata].id).click(function(evt){
            //         if($("#" + $(evt.target).attr("data-id")).is(":visible")){
            //             $("#" + $(evt.target).attr("data-id")).click()
            //         }else{
            //             for(let PageGuide in PageGuides['PageGuides']){
            //                 if(PageGuides['PageGuides'][PageGuide]['items'][$(evt.target).attr("data-id")]){
            //                     localStorage['sse-pageGuide-bottomlevel'] = $(evt.target).attr("data-id")
            //                     $("div[data-id=" + PageGuide + "]").click()
            //                 }
            //             }
            //         }
            //         return true;
            //     }).text(PageGuides['Features'][rowdata].name)
            // }else{
            //     icon.html( "N/A" )
            //     description.html( description.replace(/^: /, "") )
            // }
            // if(buttonVersion){
            //     return $("<tr>").append(
            //         $("<td>").append(name.prepend(_("Launch").t(), separator)),
            //         $("<td>").append(tour),
            //         $("<td>").append(description)
            //     )
            // }else{
            //     if(name.text() == ""){

            //         return $("<tr>").append(
            //             $("<td>").append(icon),
            //             $("<td>").append(tour),
            //             $("<td>").append(description ))
            //     }else{

            //         return $("<tr>").append(
            //             $("<td>").append(icon),
            //             $("<td>").append(tour),
            //             $("<td>").append(name, separator, description )
            //         )
                
            //     }

            // }
        }
        function sendTelemetryForIntro(action, category, guide, overrides){
            let record = { "status": "selectedIntroUseCase", "action": action, "category": category, "guide": guide }
            if(overrides){
                for(let i = 0; i < overrides.length; i++){
                    if(overrides[i].param.indexOf("usecase")>=0){
                        record.uc = overrides[i].value
                    }
                }
            }
            require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
                for(let i = 0; i < appConfig.length; i++){
                    if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                         record.demoMode = true
                    }
                }
                Telemetry.SendTelemetryToSplunk("PageStatus", record)
            })
        }

        // Now let's launch all the setup steps!

        for(let feature in PageGuides['Features']){
            if(PageGuides['Features'][feature].type == "setup"){
                if(PageGuides['Features'][feature].id == "data_inventory_complete"){
                    PageGuides['Features'][feature].deferral = $.Deferred()
                    let deferral = $.Deferred()
                    CheckIfDataInventoryComplete(deferral);
                    $.when(deferral).then(function(returnObj){
                        if(returnObj["dsc_checked"] == 0 || returnObj["dscs_with_products"] == 0){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-error" style="font-size: 18pt; color: red">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text(_("Configuration not yet started.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Configure on the Data Inventory page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Configure on the Data Inventory page.").t() + '</a>')
                            
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(returnObj["products_custom_needsReview"] > 0){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-warning" style="font-size: 18pt; color: orange">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Configuration started but not yet complete.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Configure on the Data Inventory page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Configure on the Data Inventory page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(returnObj["products_default_checked"] == returnObj["products_default_total"]){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Successfully Configured!").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Re-visit configuration on the Data Inventory page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Configure on the Data Inventory page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else{
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-question-circle" style="font-size: 18pt; color: gray">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Configuration status mixed.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Re-visit configuration on the Data Inventory page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="data_inventory"> ' + _("Configure on the Data Inventory page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }
                    })
                }else if(PageGuides['Features'][feature].id == "check_enabled_content_sources"){
                    PageGuides['Features'][feature].deferral = $.Deferred()
                    let deferral = $.Deferred()
                    CheckToSeeIfContentSourcesAreEnabled(deferral);
                    $.when(deferral).then(function(returnObj){
                        // console.log("Got a return from the app thing", returnObj)
                        let count = 0;
                        let enabled_count = 0;
                        for(let app in returnObj){
                            if(returnObj[app]){
                                enabled_count += 1;
                            }
                            count += 1;
                        }

                        if(count == 0){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-warning" style="font-size: 18pt; color: orange">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text(_("Error checking, but very likely to be correct.").t() )
                                
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure enabled sources.").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(count == enabled_count){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( Splunk.util.sprintf(_("Success. %s out of %s content sources are enabled.").t(), enabled_count, count) ),
                                $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure enabled sources.").t() + '</a>').click(function(){
                                    $("#launchConfigurationLink").click()
                                    return false;
                                })
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure enabled sources.").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }else{
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Success. All are enabled.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure enabled sources.").t() + '</a>').click(function(){
                                    $("#launchConfigurationLink").click()
                                    return false;
                                })
                            )

                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure enabled sources.").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }
                    })
                }else if(PageGuides['Features'][feature].id == "search_mapping_complete"){
                    PageGuides['Features'][feature].deferral = $.Deferred()
                    let deferral = $.Deferred()
                    CheckIfSearchesAreMapped(deferral);
                    $.when(deferral).then(function(returnObj){
                        if(returnObj["num_bookmarked_content"] == 0){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-error" style="font-size: 18pt; color: red">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text(_("Configuration not yet started.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(returnObj["num_bookmarked_content"] >= 1 && returnObj["num_enabled_content"] == 0){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-warning" style="font-size: 18pt; color: orange">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Configuration started but not yet complete.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(returnObj["num_bookmarked_content"] > 0 && returnObj["num_enabled_content"] < 20){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: orange">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Configuration started, but not many searches are marked as enabled.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(returnObj["num_bookmarked_content"] > 0 && returnObj["num_enabled_content"] >= 20){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Successfully Configured!").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Re-visit configuration on the Manage Bookmarks page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].deferral.resolve()
                        }else{
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-question-circle" style="font-size: 18pt; color: gray">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Configuration status mixed.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Re-visit configuration on the Manage Bookmarks page.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="bookmarked_content"> ' + _("Configure on the Manage Bookmarks page.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }
                    })
                }else if(PageGuides['Features'][feature].id == "check_es_integration"){
                    PageGuides['Features'][feature].deferral = $.Deferred()
                    let deferral = $.Deferred()
                    checkForMITREInLogReview(deferral);
                    $.when(deferral).then(function(status){
                        if(status == "errored"){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-warning" style="font-size: 18pt; color: orange">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text(_("Splunk Enterprise Security not present.").t() )
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure ES Integration.").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(status == "needed"){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-error" style="font-size: 18pt; color: red">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Configuration not yet complete.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure ES Integration.").t() + '</a>').click(function(){
                                    $("#launchConfigurationLink").click()
                                    return false;
                                })
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure ES Integration.").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(status == "notneeded"){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Successfully Configured!").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure ES Integration.").t() + '</a>').click(function(){
                                    $("#launchConfigurationLink").click()
                                    return false;
                                })
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure ES Integration.").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }
                    })
                }else if(PageGuides['Features'][feature].id == "check_data_availability"){
                    PageGuides['Features'][feature].deferral = $.Deferred()
                    let deferral = $.Deferred()
                    CheckWhatScheduledSearchesScheduled(deferral);
                    $.when(deferral).then(function(searches){
                        

                        if(searches["Data_Availability_Model"]){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("The Machine Learning Baseline search is scheduled!").t() )
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure Scheduled Searches").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }else{
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-error" style="font-size: 18pt; color: red">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("The Machine Learning Baseline search is not scheduled").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure Scheduled Searches").t() + '</a>').click(function(){
                                    $("#launchConfigurationLink").click()
                                    return false;
                                })
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="#"> ' + _("Configure Scheduled Searches").t() + '</a>').click(function(){
                                $("#launchConfigurationLink").click()
                                return false;
                            })
                            PageGuides['Features'][feature].deferral.resolve()
                        }
                    })
                }else if(PageGuides['Features'][feature].id == "check_mltk_present"){
                    PageGuides['Features'][feature].deferral = $.Deferred()
                    let deferral = $.Deferred()
                    CheckWhatAppsArePresent(deferral);
                    $.when(deferral).then(function(apps){
                        // console.log("MLTKCHECK: Got some apps!", apps)
                        let status = "not installed";
                        for(let app in apps){
                            // console.log("MLTKCHECK: Looking at ", app, apps[app], app=="sse-setup-app-mltk", apps[app].status == "installed", apps[app].version.match(/^([5-9]|4.[2-9])/))
                            if(app=="sse-setup-app-mltk" && apps[app].status == "installed"){
                                if(apps[app].version.match(/^([5-9]|4.[2-9])/)){
                                    status = "installed"
                                }else{
                                    status = "out of date"
                                }
                            }
                        }

                        if(status == "out of date"){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-warning" style="font-size: 18pt; color: orange">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text(_("Splunk Machine Learning Toolkit present, but is too old to use for SSE Functionality.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="https://splunkbase.splunk.com/app/2890/"> ' + _("Download via Splunkbase.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="https://splunkbase.splunk.com/app/2890/"> ' + _("Download via Splunkbase.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(status == "not installed"){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-error" style="font-size: 18pt; color: red">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Splunk Machine Learning Toolkit not present.").t() ),
                                $('<a target="_blank" class="external drilldown-link" href="https://splunkbase.splunk.com/app/2890/"> ' + _("Download via Splunkbase.").t() + '</a>')
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="https://splunkbase.splunk.com/app/2890/"> ' + _("Download via Splunkbase.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }else if(status == "installed"){
                            PageGuides['Features'][feature].iconObj = $('<i class="icon-check-circle" style="font-size: 18pt; color: green">')
                            PageGuides['Features'][feature].displayObj = $("<span></span>").append(
                                $("<span>").text( _("Splunk Machine Learning Toolkit is present!").t() )
                            )
                            PageGuides['Features'][feature].linkObj = $('<a target="_blank" class="external drilldown-link" href="https://splunkbase.splunk.com/app/2890/"> ' + _("Download via Splunkbase.").t() + '</a>')
                            PageGuides['Features'][feature].deferral.resolve()
                        }
                    })
                }
            }
        }
    })
