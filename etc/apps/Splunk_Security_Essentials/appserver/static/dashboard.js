// init
var localStoragePreface = "sse"
window.diagObject = []

// generateDiag.js content moved over to dashboard.js

/* 
// removing console redirection, because it breaks IE 11
var console = window.console

function intercept(method) {
    var original = console[method]
    console[method] = function() {
        window.diagObject.push(arguments);
        if (original.apply) {
            // Do this for normal browsers
            original.apply(console, arguments);
        } else {
            // Do this for IE
            var message = Array.prototype.slice.apply(arguments).join(' ');
            original(message);
        }
    }
}
var methods = ['log', 'warn', 'error'];
for (var i = 0; i < methods.length; i++) {
    intercept(methods[i]);
}
 */

function collectDiag() {

    require([
        "jquery", Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/vendor/jszip/jszip.js"), Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/vendor/FileSaver/FileSaver.js")
    ], function($, JSZip) {
        //console.log("JSZip Loaded", JSZip)
        var zip = new JSZip();

        var browserInfo = new Object()
        browserInfo.ua = navigator.userAgent;
        browserInfo.url = window.location.href;
        browserInfo.cookies = document.cookie;
        browserInfo.lang = navigator.language

        var searchManagers = new Object()
        for (var attribute in splunkjs.mvc.Components.attributes) {
            var sm = splunkjs.mvc.Components.getInstance(attribute)
            if (typeof sm != "undefined" && sm != null) {
                if (typeof sm.search != "undefined") {
                    searchManagers[attribute] = new Object()
                    searchManagers[attribute]['name'] = attribute
                    searchManagers[attribute]['lastError'] = sm.lastError
                    searchManagers[attribute]['attributes'] = sm.search.attributes
                }
            }
        }

        var local_configuration = window.$C

        var folder1 = zip.folder("diag-output-from-Splunk-Essentials");
        //folder1.file("console_log.json", JSON.stringify(window.diagObject, null, 4));
        folder1.file("browser_info.json", JSON.stringify(browserInfo, null, 4));
        folder1.file("search_managers.json", JSON.stringify(searchManagers, null, 4));
        folder1.file("localStorage.json", JSON.stringify(localStorage, null, 4));
        folder1.file("configuration.json", JSON.stringify(local_configuration, null, 4));
        folder1.file("tokens.json", JSON.stringify(splunkjs.mvc.Components.getInstance("submitted").attributes, null, 4));

        zip.generateAsync({ type: "blob" })
            .then(function(content) {
                // see FileSaver.js
                saveAs(content, "diag-output-from-Splunk-Essentials.zip");

            });
    })
}

var mylink = $("<a href=\"#\">Generate Essentials-only Diag</a>").click(function() {
    collectDiag()
    return false;
})
$('div[data-view="views/shared/splunkbar/help/Master"]').find("ul").append($("<li></li>").append(mylink))



/// Clear Demo Functionality


function clearDemo() {


    require([
            "jquery",
            "underscore",
            "splunkjs/mvc",
            "splunkjs/mvc/utils",
            "splunkjs/mvc/tokenutils",
            "splunkjs/mvc/simplexml",
            "splunkjs/mvc/searchmanager",
            Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/data/sendTelemetry.js"),
            //"components/splunk/AlertModal",
            //"views/shared/AlertModal.js",
            //"views/shared/Modal.js",

            //        "components/controls/Modal",
            "splunkjs/ready!",
            "bootstrap.tooltip",
            "bootstrap.popover",
            "css!../app/Splunk_Security_Essentials/style/data_source_check.css"
        ],
        function(
            $,
            _,
            mvc,
            utils,
            TokenUtils,
            DashboardController,
            SearchManager,
            Telemetry,
            //AlertModal,
            // Modal,
            Ready //,
            //ShowcaseInfo
        ) {

            var resetSearch = new SearchManager({
                "id": "resetSearch",
                "cancelOnUnload": true,
                "latest_time": "0",
                "sample_ratio": null,
                "status_buckets": 0,
                "autostart": true,
                "earliest_time": "now",
                "search": '| inputlookup bookmark_lookup | where a=b | outputlookup bookmark_lookup',
                "app": utils.getCurrentApp(),
                "auto_cancel": 90,
                "preview": true,
                "runWhenTimeIsUndefined": false
            }, { tokens: false });

            var resetSearch2 = new SearchManager({
                "id": "resetSearch2",
                "cancelOnUnload": true,
                "latest_time": "0",
                "sample_ratio": null,
                "status_buckets": 0,
                "autostart": true,
                "earliest_time": "now",
                "search": '| inputlookup bookmark_custom_lookup | where a=b | outputlookup bookmark_custom_lookup',
                "app": utils.getCurrentApp(),
                "auto_cancel": 90,
                "preview": true,
                "runWhenTimeIsUndefined": false
            }, { tokens: false });

            var resetSearch3 = new SearchManager({
                "id": "resetSearch3",
                "cancelOnUnload": true,
                "latest_time": "0",
                "sample_ratio": null,
                "status_buckets": 0,
                "autostart": true,
                "earliest_time": "now",
                "search": '| inputlookup data_inventory_eventtypes_lookup | where a=b | outputlookup data_inventory_eventtypes_lookup',
                "app": utils.getCurrentApp(),
                "auto_cancel": 90,
                "preview": true,
                "runWhenTimeIsUndefined": false
            }, { tokens: false });


            for (var key in localStorage) {
                if (localStorage.hasOwnProperty(key) && key.indexOf(localStoragePreface + "-") == 0 && key.indexOf(localStoragePreface + "-metrics-") == -1) {
                    localStorage.removeItem(key)
                }
            }

            alert("Success")


        })
    localStorage[localStoragePreface + '-splMode'] = "false"


}
var mylink = $("<a href=\"#\">Demos Only - Reset Everything</a>").click(function() {
    clearDemo()
    location.reload()
})
$('div[data-view="views/shared/splunkbar/help/Master"]').find("ul").append($("<li></li>").append(mylink))



// Metrics 
if (typeof(localStorage[localStoragePreface + "-metrics-numViews"]) == "undefined" || localStorage[localStoragePreface + "-metrics-numViews"] == "undefined") {
    localStorage[localStoragePreface + "-metrics-numViews"] = 1
} else {
    localStorage[localStoragePreface + "-metrics-numViews"]++
}

var myPage = splunkjs.mvc.Components.getInstance("env").toJSON().page
if (window.location.search.indexOf("ml_toolkit.dataset") != -1 || window.location.search.indexOf("showcase=") != -1) {
    // https://css-tricks.com/snippets/jquery/get-query-params-object/
    jQuery.extend({
        getQueryParameters: function(str) {
            return (str || document.location.search).replace(/(^\?)/, '').split("&").map(function(n) { return n = n.split("="), this[n[0]] = n[1], this }.bind({}))[0];
        }
    });
    var queryParams = $.getQueryParameters();
    if (window.location.search.indexOf("ml_toolkit.dataset") != -1) {
        myPage += " -- " + decodeURIComponent(queryParams['ml_toolkit.dataset'])
    } else {
        myPage += " -- " + decodeURIComponent(queryParams['showcase'])
    }
}
if (typeof(localStorage[localStoragePreface + "-metrics-pageViews"]) == "undefined" || localStorage[localStoragePreface + "-metrics-pageViews"] == "undefined") {
    var init = {}
    init[myPage] = 1
    localStorage[localStoragePreface + "-metrics-pageViews"] = JSON.stringify(init)
} else {
    var pageMetrics = JSON.parse(localStorage[localStoragePreface + "-metrics-pageViews"])
    if (typeof pageMetrics[myPage] == "undefined") {
        pageMetrics[myPage] = 1
    } else {
        pageMetrics[myPage]++
    }
    localStorage[localStoragePreface + "-metrics-pageViews"] = JSON.stringify(pageMetrics)
}


// Utility

function waitForEl(selector, callback) {
    var poller1 = setInterval(function() {
        $jObject = jQuery(selector);
        if ($jObject.length < 1) {
            return;
        }
        clearInterval(poller1);
        callback($jObject)
    }, 20);
}



function triggerError(textStatus, banner) {

    // set the runtime environment, which controls cache busting
    var runtimeEnvironment = 'production';

    // set the build number, which is the same one being set in app.conf
    var build = '10138';

    // get app and page names
    var pathComponents = location.pathname.split('?')[0].split('/');
    var appName = 'Splunk_Security_Essentials';
    var pageIndex = pathComponents.indexOf(appName);
    var pageName = pathComponents[pageIndex + 1];

    // path to the root of the current app
    var appPath = "../app/" + appName;

    var requireConfigOptions = {
        paths: {
            // app-wide path shortcuts
            "components": appPath + "/components",
            "vendor": appPath + "/vendor",
            "Options": appPath + "/components/data/parameters/Options",

            // requirejs loader modules
            "text": appPath + "/vendor/text/text",
            "json": appPath + "/vendor/json/json",
            "css": appPath + "/vendor/require-css/css",

            // jquery shims
            "jquery-ui-slider": appPath + "/vendor/jquery-ui-slider/jquery-ui.min",

            // highcharts shims
            "highcharts-amd": appPath + "/vendor/highcharts/highcharts.amd",
            "highcharts-more": appPath + "/vendor/highcharts/highcharts-more.amd",
            "highcharts-downsample": appPath + "/vendor/highcharts/modules/highcharts-downsample.amd",
            "no-data-to-display": appPath + "/vendor/highcharts/modules/no-data-to-display.amd",

            // srcviewer shims
            "prettify": appPath + "/vendor/prettify/prettify",
            "showdown": appPath + "/vendor/showdown/showdown",
            "codeview": appPath + "/vendor/srcviewer/codeview"
        },
        shim: {
            "jquery-ui-slider": {
                deps: ["css!" + appPath + "/vendor/jquery-ui-slider/jquery-ui.min.css"]
            }
        },
        config: {
            "Options": {
                // app-wide options
                "options": {
                    "appName": 'Splunk_Security_Essentials',
                    // the number of points that's considered "large" - how each plot handles this is up to it
                    "plotPointThreshold": 1000,
                    "maxSeriesThreshold": 1000,
                    "smallLoaderScale": 0.4,
                    "largeLoaderScale": 1,
                    "highchartsValueDecimals": 2,
                    "defaultModelName": "default_model_name",
                    "defaultRoleName": "default",
                    "dashboardHistoryTablePageSize": 5
                }
            }
        }
    };
    require.config(requireConfigOptions);
    require(['jquery',
        Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/Modal.js")
    ], function($,
        Modal) {
        // Now we initialize the Modal itself
        var myModal = new Modal("errorModal", {
            title: "Error!",
            backdrop: 'static',
            keyboard: false,
            destroyOnHide: true,
            type: 'wide'
        });

        $(myModal.$el).on("show", function() {

        })
        if (!banner || banner == "") {
            banner = "Received the following error:"
        }
        if (typeof textStatus == "string") {
            myModal.body
                .append($("<h3>" + banner + "</h3>"), $("<p>").text(textStatus));
        } else {
            myModal.body
                .append($("<h3>" + banner + "</h3>"), $(textStatus));

        }
        myModal.footer.append($('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn btn-primary').text('Close').on('click', function() {
            // Not taking any action here
        }))
        myModal.show(); // Launch it!


    })

    try{
        let telemetry_banner = $("<div>").append(banner).html()
        let telemetry_msg = $("<div>").append(textStatus).html()
        require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
            let record = {
                "banner": telemetry_banner, 
                "msg": telemetry_msg, 
                "locale": $C["LOCALE"], 
                "url_anon": window.location.href.replace(/http:\/\/.*?\//, "http://......../").replace(/https:\/\/.*?\//, "https://......../"),
                "page": splunkjs.mvc.Components.getInstance("env").toJSON()['page'],
                "splunk_version": splunkjs.mvc.Components.getInstance("env").toJSON()['version']
            }
            for(let i = 0; i < appConfig.length; i++){
                if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                     record.demoMode = true
                }
            }
            Telemetry.SendTelemetryToSplunk("ErrorOccurred", record )
        })
    }catch(error){
        // Nothing
    }
}


function checkForErrors(ShowcaseInfo) {
    require(['jquery',
        Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/Modal.js")
    ], function($,
        Modal) {
    // console.log("Checking for errors..", ShowcaseInfo['throwError'])
    if (ShowcaseInfo['throwError']) {
        let error = $('<table class="table"><thead><tr><th>Description</th><th>Message</th></tr></thead></table>')
        let errorTable = $("<tbody>")
        // console.log("Looking at ShowcaseInfo - Debug - Length", ShowcaseInfo['debug'].length)
        for (let g = 0; g < ShowcaseInfo['debug'].length; g++) {
            // console.log("Got a showcase event", ShowcaseInfo['debug'][g])
            if (typeof ShowcaseInfo['debug'][g] == "object") {
                try {
                    let message = ShowcaseInfo['debug'][g];
                    let stackTrace = "";
                    
                    if (message.status && message.status == "ERROR") {
                        if(message.traceback){
                            stackTrace = $('<a style="float: right; margin-left: 5px;" title="Stack Trace" ><i class="icon-code" /></a>').attr("data-content", message.traceback).click(function(evt){
                                let obj = $(evt.target)
                                if(obj.prop("tagName") == "I"){
                                    obj = obj.closest("a");
                                }
                                let stacktrace = obj.attr("data-content");

                                let myModal = new Modal("stackTrace", {
                                    title: "Stack Trace",
                                    backdrop: 'static',
                                    keyboard: false,
                                    destroyOnHide: true,
                                    type: 'wide'
                                });
                                myModal.body.append($("<pre>").text(stacktrace));
                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn btn-primary').text('Close'))
                                myModal.show(); 

                            })
                            // console.log("Got a stack trace", stackTrace)
                        }else{
                            // console.log("No stack trace!", message)
                        }
                        errorTable.append($('<tr>').append($('<td>' + message.description + '</td>'), $('<td>' + message.message + '</td>').prepend(stackTrace)))
                    }
                } catch (err) {
                    // no handling
                }
            } else if (typeof ShowcaseInfo['debug'][g] == "string" && ShowcaseInfo['debug'][g].indexOf('"status": "ERROR"') >= 0) {
                // console.log("Got a valid error", ShowcaseInfo['debug'][g])
                try {
                    let message = JSON.parse(ShowcaseInfo['debug'][g]);
                    if (message.status && message.status == "ERROR") {
                        if(message.traceback){
                            stackTrace = $('<a style="float: right; margin-left: 5px;" title="Stack Trace" ><i class="icon-code" /></a>').attr("data-content", message.traceback).click(function(evt){
                                let obj = $(evt.target)
                                if(obj.prop("tagName") == "I"){
                                    obj = obj.closest("a");
                                }
                                let stacktrace = obj.attr("data-content");

                                let myModal = new Modal("stackTrace", {
                                    title: "Stack Trace",
                                    backdrop: 'static',
                                    keyboard: false,
                                    destroyOnHide: true,
                                    type: 'wide'
                                });
                                myModal.body.append($("<pre>").text(stacktrace));
                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn btn-primary').text('Close'))
                                myModal.show(); 

                            })
                            // console.log("Got a stack trace", stackTrace)
                        }else{
                            // console.log("No stack trace!", message)
                        }
                        errorTable.append($('<tr>').append($('<td>' + message.description + '</td>'), $('<td>' + message.message + '</td>').prepend(stackTrace)))
                    }
                } catch (err) {
                    // no handling
                }
            }
        }
        if (errorTable.find("tr").length > 0) {
            error.append(errorTable);
            $(".dashboard-view-controls").prepend($("<button style=\"margin-left: 5px;\" class=\"btn\"><span style=\"font-size: 16px; font-weight: bolder; color: red;\">!</span></button>").click(function() {
                triggerError(error)
            }));
        }
    }
    // console.log("Ending ShowcaseInfo", ShowcaseInfo)
    })
}

function setbookmark_status(name, showcaseId, status, action) {

    if (!action) {
        action = splunkjs.mvc.Components.getInstance("env").toJSON()['page']
    }require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
        let record = { "status": status, "name": name, "selectionType": action }
        for(let i = 0; i < appConfig.length; i++){
            if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                 record.demoMode = true
            }
        }
        Telemetry.SendTelemetryToSplunk("BookmarkChange", record )
    })

    require(["splunkjs/mvc/utils", "splunkjs/mvc/searchmanager"], function(utils, SearchManager) {
        if (typeof splunkjs.mvc.Components.getInstance("logBookmarkChange-" + name.replace(/[^a-zA-Z0-9]/g, "_")) == "object") {
            splunkjs.mvc.Components.revokeInstance("logBookmarkChange-" + name.replace(/[^a-zA-Z0-9]/g, "_"))
        }
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
    for (var i = 0; i < window.ShowcaseInfo.roles.default.summaries; i++) {
        if (name == window.ShowcaseInfo.summaries[window.ShowcaseInfo.roles.default.summaries[i]]) {
            window.ShowcaseInfo.summaries[window.ShowcaseInfo.roles.default.summaries[i]].bookmark_status = status
        }
    }

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
                    success: function(returneddata) {bustCache();  newkey = returneddata },
                    error: function(xhr, textStatus, error) {
                        bustCache(); 
                        triggerError("Error saving bookmark!")
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
                    success: function(returneddata) {bustCache();  newkey = returneddata },
                    error: function(xhr, textStatus, error) {
                        bustCache(); 
                        triggerError("Error saving bookmark!")
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



// *** Replaced with app trigger ***
// ///////
// /// Verify that the NAV has the expected elements
// ///////
// setTimeout(function(){
// // function testNav(){
//     let myRandomNum = Math.round(Math.random() * 5)
//     if(build && localStorage["sse-nav-checked"] && localStorage["sse-nav-checked"] == build && myRandomNum != 3){
//         // console.log("NAVUPDATE Already adjusted nav for this version, skipping", myRandomNum);
//         return 
//     }
//     // console.log("NAVUPDATE Starting the nav check", build, localStorage["sse-nav-checked"])
//     $.ajax({
//         url: $C['SPLUNKD_PATH'] + "/servicesNS/nobody/Splunk_Security_Essentials/data/ui/nav/default",

//         type: 'GET',
//         success: function(data) {
            
//             let nav = $($(data).find("[name='eai:data']").text())
//             let finalNav = ""
//             window.dvnavoriginal = $(data).find("[name='eai:data']").text()
            
//             let requiredNav = {
//                 "Security Content": '\
//                 <collection label="Security Content">\
//                   <view name="contents"/>\
//                   <divider />\
//                   <view name="overview" />\
//                   <view name="bookmarked_content" />\
//                   <view name="custom_content" />\
//                 </collection>',
//                 "Beta": '\
//                 <collection label="Beta">\
//                   <view name="beta_overview" />\
//                   <divider />\
//                   <view name="data_inventory" />\
//                   <view name="content_overview" />\
//                   <view name="mitre_overview" />\
//                   <view name="kill_chain_overview" />\
//                   <divider />\
//                   <view name="sse_data_availability" />\
//                   <view name="analyze_es_risk" />\
//                   <divider />\
//                   <saved name="Saved Searches and the Data that Enables Them" />\
//                   <saved name="Products and the Content Mapped to Them" />\
//                   <a href="search?q=%7C%20sseanalytics">Core sseanalytics Comand</a>\
//                 </collection>'
//             } 

//             for(let key in requiredNav){
//                 let collectionInLiveNav = nav.find("> collection[label=\"" + key + "\"]")
//                 if(collectionInLiveNav.length == 0){
//                     // console.log("NAVUPDATE Couldn't find", key, "collection in nav at all", "> collection[label=\"" + key + "\"]")
//                     nav.append(requiredNav[key])
//                     finalNav = $("<div>").append(nav).html()
//                     // need to add it outright
//                 }else{
//                     let elements = $(requiredNav[key]).find("view,saved,a")
//                     window.collectionInLiveNav = collectionInLiveNav
//                     for(let i = 0; i < elements.length; i++){
//                         // console.log("NAVUPDATE Evaluating", elements[i])
//                         let tag = $(elements[i]).prop("tagName").toLowerCase()
//                         let needToReplace = false
//                         if(tag == "a"){
//                             if(collectionInLiveNav.find(tag + "[href=\"" + $(elements[i]).attr("href").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]").length==0){
//                                 // console.log("NAVUPDATE Didn't find ", tag + "[href=\"" + $(elements[i]).attr("href").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                                 needToReplace = true
//                             }else{
//                                 // console.log("NAVUPDATE Found ", tag + "[href=\"" + $(elements[i]).attr("href").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                             }   
//                         }else if(tag == "view"){
//                             if(collectionInLiveNav.find(tag + "[name=\"" + $(elements[i]).attr("name").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]").length==0){
//                                 // console.log("NAVUPDATE Didn't find ", tag + "[name=\"" + $(elements[i]).attr("name").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                                 needToReplace = true
//                             }else{
//                                 // console.log("NAVUPDATE Found ", tag + "[name=\"" + $(elements[i]).attr("name").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                             }   
//                         }else if(tag == "saved"){
//                             if(collectionInLiveNav.find(tag + "[name=\"" + $(elements[i]).attr("name").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]").length==0){
//                                 // console.log("NAVUPDATE Didn't find ", tag + "[name=\"" + $(elements[i]).attr("name").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                                 needToReplace = true
//                             }else{
//                                 // console.log("NAVUPDATE Found ", tag + "[name=\"" + $(elements[i]).attr("name").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                             }   
//                         }else if(tag == "collection"){
//                             if(collectionInLiveNav.find(tag + "[label=\"" + $(elements[i]).attr("label").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]").length==0){
//                                 // console.log("NAVUPDATE Didn't find ", tag + "[label=\"" + $(elements[i]).attr("label").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                                 needToReplace = true
//                             }else{
//                                 // console.log("NAVUPDATE Found ", tag + "[label=\"" + $(elements[i]).attr("label").replace(/([^a-zA-Z0-9 \-_=\.\]\[])/g, "\\$1") + "\"]", " in nav")
//                             }   
//                         }
//                         if(needToReplace){
//                             nav.find("> collection[label=\"" + key + "\"]").replaceWith(requiredNav[key])
//                             finalNav = $("<div>").append(nav).html()
//                         }
//                     }
//                 }
                
//             }
//             window.dvnav = nav
//             window.dvnavfinal = finalNav
            
//             if(finalNav!=""){
//                 var data = {
//                     "eai:data": finalNav
//                 };
//                           console.log("NAVUPDATE Moving forward with this new nav", finalNav, data)
//                 $.ajax({
//                     url: $C['SPLUNKD_PATH'] + "/servicesNS/nobody/Splunk_Security_Essentials/data/ui/nav/default",
//                     data: data,
//                     type: 'POST',
//                     success: function(data) {
//                         // Eh, sit around
//                         console.log("NAVUPDATE Successful Update")
//                         delete localStorage["sse-navigationError"]
//                         localStorage["sse-nav-checked"] = build
//                     },
//                     error: function(data, error) {
//                         console.log("NAVUPDATE failed update!", data, error)
//                         if(!localStorage["sse-navigationError"]){
//                             localStorage["sse-navigationError"] = 1
//                         }else{
//                             localStorage["sse-navigationError"] = parseInt(localStorage["sse-navigationError"]) + 1
//                             if(parseInt(localStorage["sse-navigationError"]) == 40){
//                                 localStorage["sse-navigationError"] = 1
//                             }
//                         }
//                         if(parseInt(localStorage["sse-navigationError"]) == 1){
//                             triggerError("Error updating navigation. It seems that you have a local navigation present, but we're not able to update it with the latest content. The most likely reason for this is a permissions issue -- please have someone with app ownership rights browse to the app and it will automatically post an update after a few seconds.")
//                         }
//                         // Error Handling? We don't need no stinkin' error handling!
//                     }
//                 });
//             }else{
//                 localStorage["sse-nav-checked"] = build
//             }

//         },
//         error: function(data, error) {
//                  console.error("NAVUPDATE Error!", data, error);
//         }
//     });

// },3000)

///////
/// Handle Busting of the Cache Used for ShowcaseInfo to speed page load
///////

// Model: 0 = not scheduled, 1 = scheduled, 2 = in progress, 3 = got a request mid-bust, schedule another to run after it completes.
window.isbustscheduled = 0
function bustCache(updateTime){
    // Disabling cache busting 'cause it's not worth the effort and doesn't actually improve performance. (Discovered that time to download was the real problem, not time to gen the showcase)
    return 
    
    //console.log("Got a request, current", isbustscheduled, updateTime)
    if(updateTime){
        window.isbustscheduled = 2
        require(['json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString || "" + '&bust=' + Math.round(Math.random()*10000000)], function(){
            if(window.isbustscheduled == 3){
                // someone requested it while we were busting
                bustCache(true)
            }
            window.isbustscheduled = 0
        })
    }else if(window.isbustscheduled == 0){
        window.isbustscheduled = 1
        //console.log("scheduled!")
        setTimeout(function(){
            bustCache(true)
        }, 3000)
    }else if(window.isbustscheduled == 2){
        // A bust is currently in progress
        window.isbustscheduled = 3

    }
}
if(location.href.indexOf("127.0.0.1") >= 0 || location.href.indexOf("localhost") >= 0){
    localStorage['sse-require_cache_update'] = "requireupdate"
}else{
    if(localStorage['sse-require_cache_update'] == "requireupdate"){
        setTimeout(function(){
            localStorage['sse-require_cache_update'] = "cached"
        }, 5000)
    }
}
$(window).on("beforeunload", function() {
    if(window.isbustscheduled == 1 || window.isbustscheduled == 3){
        localStorage['sse-require_cache_update'] = "requireupdate"
        bustCache(true)
    }
});


//////
// Allow this functionality to run anywhere
//////

function showMITREElement(type, name){

    require(["underscore", 
    "jquery", 
    'components/controls/Modal',
    'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitreattack&locale=' + window.localeString,
    'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitrepreattack&locale=' + window.localeString],
    function(_, 
        $, 
        Modal, 
        mitre_attack,
        mitre_preattack
        ){ 
            let desiredObject = {}
            let pretty_type = "";
            let source = "";
            let drilldown_label = "";
            let mitre_drilldown_url = ""
            if(type == "x-mitre-tactic"){
                pretty_type = _("MITRE ATT&CK Tactic").t()
                drilldown_label = "mitre_tactic_display"
            }else if(type == "attack-pattern"){
                pretty_type = _("MITRE ATT&CK Technique").t()
                drilldown_label = "mitre_technique_display"
            }else if(type == "intrusion-set"){
                pretty_type = _("MITRE ATT&CK Threat Group").t()
                drilldown_label = "mitre_threat_groups"
            }
            // console.log("Got a request for",type, name);
            for(let i = 0; i < mitre_attack.objects.length; i++){
                if(mitre_attack.objects[i].type == type && mitre_attack.objects[i].name == name){
                    desiredObject = mitre_attack.objects[i]
                    source = "MITRE Enterprise ATT&CK"
                    break;
                }
            }
            if(Object.keys(desiredObject).length == 0){
                for(let i = 0; i < mitre_preattack.objects.length; i++){
                    if(mitre_preattack.objects[i].type == type && mitre_preattack.objects[i].name == name){
                        desiredObject = mitre_preattack.objects[i]
                        source = "MITRE PRE-ATT&CK"
                        break;
                    }
                }
            }
            // Now we initialize the Modal itself
            var myModal = new Modal("mitreExplanation", {
                title: pretty_type + ": " + name,
                backdrop: 'static',
                keyboard: true,
                destroyOnHide: true,
                
            });
            myModal.$el.addClass("modal-extra-wide")
            let myBody = $("<div>")
            if(Object.keys(desiredObject).length == 0){
                myBody.html("<p>Application Error -- " + name + " not found.</p>")
            }else{
            
                for(let i = 0; i < desiredObject['external_references'].length; i++){
                    if(desiredObject['external_references'][i].url && desiredObject['external_references'][i].url.indexOf("https://attack.mitre.org/")>=0){
                        id = desiredObject['external_references'][i].external_id;
                        mitre_drilldown_url = desiredObject['external_references'][i].url;
                    }
                }

                myBody.append("<h4>" + _("Description").t() + "</h4>")
                myBody.append($("<p style=\"white-space: pre-line\">").text(desiredObject['description'].replace(/\[([^\]]*)\]\(.*?\)/g, "$1")))
                
                // // Would need to resolve this to the pretty name, which seems exhausting. Punting for now.
                // if(type == "attack-pattern"){
                //     let phases = []
                //     for(let i = 0; i < desiredObject['kill_chain_phases'].length; i++){
                //         phases.append(desiredObject['kill_chain_phases'][i].phase_name) 
                //     }
                //     myBody.append("<h4>" + _("MITRE ATT&CK Tactics Using Technique").t() + "</h4>")
                //     myBody.append($("<p>").text(phases.join(", ")))
                // }
                
                if(desiredObject['x_mitre_detection']){
                    myBody.append("<h4>" + _("Detection Overview").t() + "</h4>")
                    myBody.append($("<p style=\"white-space: pre-line\">").text(desiredObject['x_mitre_detection'].replace(/\[([^\]]*)\]\(.*?\)/g, "$1")))
                }
                
                myBody.append("<h4>" + _("Links").t() + "</h4>")
                myBody.append($("<p>").append( $('<a target="_blank" class="external drilldown-icon">').text(_("MITRE ATT&CK Site").t()).attr("href", mitre_drilldown_url) ))
                myBody.append($("<p>").append( $('<a target="_blank" class="external drilldown-icon">').text(_("Splunk Security Essentials Content").t()).attr("href", "contents#" + drilldown_label + "=" + encodeURIComponent(name.replace(/ /g, "_"))) ))
                
                myBody.append("<h4>" + _("Source").t() + "</h4>")
                myBody.append($("<p>").text(source))
                
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
window.showMITREElement = showMITREElement



function setAppConfig(param, value, deferral){
    let record = {
        _key: param,
        param: param,
        value: value,
        user: $C['USERNAME'],
        _time: Date.now() / 1000
    }
    $.ajax({
        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config/?query={"_key": "' + record['_key'] + '"}',
        type: 'GET',
        contentType: "application/json",
        async: false,
        success: function(returneddata) {
            if (returneddata.length == 0) {
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config/',
                    type: 'POST',
                    contentType: "application/json",
                    async: false,
                    data: JSON.stringify(record),
                    success: function(returneddata) {
                        if(deferral){
                            deferral.resolve(true, returneddata)
                        } 
                    },
                    error: function(xhr, textStatus, error) {
                        if(deferral){
                            deferral.resolve(false, error)
                        } 
                    }
                })
            } else {
                // Old
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config/' + record['_key'],
                    type: 'POST',
                    contentType: "application/json",
                    async: false,
                    data: JSON.stringify(record),
                    success: function(returneddata) {
                        if(deferral){
                            deferral.resolve(true, returneddata)
                        } 
                    },
                    error: function(xhr, textStatus, error) {
                        if(deferral){
                            deferral.resolve(false, error)
                        } 
                    }
                })
            }
        },
        error: function(error, data, other) {
            //     console.log("Error Code!", error, data, other)
        }
    })           
}
window.setAppConfig = setAppConfig