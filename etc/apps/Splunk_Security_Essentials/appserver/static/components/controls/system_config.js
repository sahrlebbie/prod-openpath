'use strict';

let myObj = $("a[data-target-view=home]").clone()
myObj.removeAttr("data-active")
myObj.attr("id", "launchConfigurationLink")
myObj.find("span").text("Configuration")
myObj.removeAttr("data-target-view")
myObj.attr("href", "#")
myObj.click(function() {
    $("#systemConfig").css("display", "block");
    $("#systemConfigBackdrop").css("display", "block");
    return false;
})
$("a[data-target-view=home]").parent().append(myObj)


setTimeout(function(){
        
    require(['jquery',
        'underscore',
        Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/Modal.js"),
        // 'json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/external_content/',
        'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config', 
        'components/data/health_checks'
    ], function($,
        _,
        Modal,
        // ShowcaseInfo, 
        external_content,
        appConfig) {
            function setUpDemoConfig(demofile){
                if(!demofile){
                    demofile = "botsv3"
                }
                let config = {
                    "searches": "1",
                    "data_inventory": "1",
                    "custom_content": "1",
                    "bookmarks": "1"
                }
                let enabledAppsDeferral = $.Deferred()
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/services/apps/local?output_mode=json&count=0',
                    type: 'GET',
                    async: true,
                    success: function(returneddata) {
                        enabledAppsDeferral.resolve(returneddata);
                    },
                    error: function(xhr, textStatus, error) {
                        enabledAppsDeferral.resolve({"entry": []})
                    }
                })
                let savedSearchesDeferral = $.Deferred()
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/services/saved/searches?output_mode=json&count=0',
                    type: 'GET',
                    async: true,
                    success: function(returneddata) {
                        savedSearchesDeferral.resolve(returneddata);
                    },
                    error: function(xhr, textStatus, error) {
                        savedSearchesDeferral.resolve({"entry": []})
                    }
                })

                let demoBlobDeferral = $.Deferred()

                $.ajax({
                    url: 'https://sse-content.s3.amazonaws.com/demo_config_' + demofile + '.json',
                    type: 'GET',
                    async: true,
                    success: function(returneddata) {
                        demoBlobDeferral.resolve(returneddata);
                    },
                    error: function(xhr, textStatus, error) {
                        triggerError("Got an error grabbing your demo config. Please refresh this page to try again.")
                    }
                })

                
                $.when(enabledAppsDeferral, savedSearchesDeferral, demoBlobDeferral).then(function(enabledApps, savedSearches, blob){
                    // console.log("loaded", arguments)
                    // console.log("enabledApps", enabledApps)
                    // console.log("savedSearches", savedSearches)
                    let apps = []
                    for(let i = 0; i < enabledApps.entry.length; i++){
                        apps.push(enabledApps.entry[i].name)
                    }
                    window.dvapps = apps
                    // console.log("finalApps", apps)
                    let searches = []
                    let validKeys = ["action.correlationsearch", "action.correlationsearch.enabled", "action.correlationsearch.label", "action.email.sendresults", "action.notable", "action.notable.param.default_owner", "action.notable.param.default_status", "action.notable.param.drilldown_name", "action.notable.param.drilldown_search", "action.notable.param.nes_fields", "action.notable.param.rule_description", "action.notable.param.rule_title", "action.notable.param.security_domain", "action.notable.param.severity", "action.risk", "action.risk.param._risk_object", "action.risk.param._risk_object_type", "action.risk.param._risk_score", "action.summary_index._name", "alert.digest_mode", "alert.suppress", "alert.suppress.fields", "alert.suppress.period", "alert.track", "counttype", "cron_schedule", "description", "disabled", "dispatch.earliest_time", "dispatch.latest_time", "dispatch.rt_backfill", "enableSched", "is_visible", "quantity", "relation", "search"]
                    for(let i = 0; i < savedSearches.entry.length; i++){
                        searches[savedSearches.entry[i].name] = {}
                        for(let key in savedSearches.entry[i]['content']){
                            if(validKeys.indexOf(key) >= 0){
                                searches[savedSearches.entry[i].name][key] = savedSearches.entry[i]['content'][key]
                            }
                        }
                    }
                    window.dvsearches = searches
                    // console.log("finalSearches", searches)

                    config["enabledApps"] = apps
                    config["savedSearches"] = searches
                    loadDemoSetup(config, blob)
                })
                
            }
            function loadDemoSetup(config, blob){
                
                if(config["enabledApps"] && config["searches"] && config["searches"] == 1){
                    // console.log("Launching saved searches")

                    let svc = splunkjs.mvc.createService();
                    
                    
                    for(let i = 0; i < blob["searches"].length; i++){
                        if(config["enabledApps"].indexOf(blob["searches"][i].app) == -1){
                            blob["searches"][i].app = "search";
                        }
                        if(! config["savedSearches"][blob["searches"][i].source]){
                            let title = blob["searches"][i].source
                            let record = {
								"cron_schedule": "1 2 3 4 5",
								"disabled": "0",
								"action.correlationsearch": "0",
								"action.correlationsearch.enabled": "1",
								"action.correlationsearch.label": title.replace(/^.*?- /, "").replace(/ -.*?$/, ""),
								"action.email.sendresults": "0",
								"action.notable": "1",
								"action.notable.param.security_domain": title.replace(/ - .*/, "").toLowerCase(),
								"action.notable.param.severity": "high",
								"action.notable.param.rule_title": title.replace(/^.*?- /, "").replace(/ -.*?$/, ""),
								"action.notable.param.rule_description": "Placeholder Generated - " + title.replace(/^.*?- /, "").replace(/ -.*?$/, ""),
								"action.notable.param.nes_fields": "dest,extension",
								"action.notable.param.drilldown_name": "View details",
								"action.notable.param.drilldown_search": "| Generic Placeholder",
								"action.notable.param.default_status": "",
								"action.notable.param.default_owner": "",
								"action.risk": "1",
								"action.risk.param._risk_object": "dest",
								"action.risk.param._risk_object_type": "system",
								"action.risk.param._risk_score": "100",
								"action.summary_index._name": "notable",
								"alert.digest_mode": "1",
								"alert.suppress": "1",
								"alert.suppress.fields": "dest,extension",
								"alert.suppress.period": "86300s",
								"alert.track": "false",
								"counttype": "number of events",
								"relation": "greater than",
								"quantity": "0",
								"description": "Generic Placeholder - " + title.replace(/ - .*/, "").toLowerCase(),
								"dispatch.earliest_time": "rt-5m@m",
								"dispatch.latest_time": "rt+5m@m",
								"dispatch.rt_backfill": "1",
								"enableSched": "1",
								"is_visible": "false",
								"search": "| generic placeholder",
                            }
                            
                            let fileDeferred = $.Deferred();
                            let appscope = {}
                            appscope['owner'] = "admin"
                            appscope['app'] = blob["searches"][i].app;
                            appscope['sharing'] = "app";
                            let files = svc.configurations(appscope);
                            
                            files.fetch({ 'search': 'name=savedsearches"' }, function(err, files) {
                                let confFile = files.item("savedsearches");
                                fileDeferred.resolve(confFile)
        
                            });
                            fileDeferred.done(function(confFile) {
                                confFile.create(title, record, function(err, stanza) {
                                    if (err) {
                                        
                                    } else {
                                        // console.log("save issue", arguments)
                                        return true;
                                    }
                                })
                            });
                        
                            // console.log("Saving", title, record)
                        }else{
                            
                            config["savedSearches"][blob["searches"][i].source]["cron_schedule"] = "1 2 3 4 5"
                            config["savedSearches"][blob["searches"][i].source]["disabled"] = "0"
                            
                            let fileDeferred = $.Deferred();
                            let appscope = {}
                            appscope['owner'] = "admin"
                            appscope['app'] = blob["searches"][i].app;
                            appscope['sharing'] = "app";
                            let files = svc.configurations(appscope);
                            files.fetch({ 'search': 'name=savedsearches"' }, function(err, files) {
                                let confFile = files.item("savedsearches");
                                fileDeferred.resolve(confFile)
        
                            });
                            fileDeferred.done(function(confFile) {
                                confFile.post(blob["searches"][i].source, config["savedSearches"][blob["searches"][i].source], function(err, stanza) {
                                    if (err) {
                                        
                                    } else {
                                        // console.log("save issue", arguments)
                                        return true;
                                    }
                                })
                            });
                        
                            // console.log("Updating", blob["searches"][i].source, config["savedSearches"][blob["searches"][i].source])
                        }
                    }
                }else{
                    // console.log("Skipping searches")
                }
                let deferrals = []
                if(config["data_inventory"] && config["data_inventory"] == 1){
                    let myDeferral1 = $.Deferred()
                    let myDeferral2 = $.Deferred()
                    deferrals.push(myDeferral1)
                    deferrals.push(myDeferral2)
                    // console.log("Launching data inventory")
                    for(let i = 0; i < blob["data_inventory_products"].length; i++){
                        blob["data_inventory_products"][i]["_key"] = blob["data_inventory_products"][i]["productId"]
                    }
                    for(let i = 0; i < blob["data_inventory_eventtypes"].length; i++){
                        blob["data_inventory_eventtypes"][i]["_key"] = blob["data_inventory_eventtypes"][i]["eventtypeId"]
                    }
                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/',
                            type: 'DELETE',
                            async: true,
                            success: function(returneddata) {
                            },
                            error: function(xhr, textStatus, error) {
                            }
                        })
                    },4000)


                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/batch_save',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(blob["data_inventory_products"]),
                            success: function(returneddata) {
                                // console.log("Got a return from my big update", returneddata)
                                myDeferral1.resolve()
                            },
                            error: function(){
                                // console.log("kvstore errors", arguments);
                                myDeferral1.resolve()
                            }                    
                        })
                    },4500)

                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes/',
                            type: 'DELETE',
                            async: true,
                            success: function(returneddata) {
                            },
                            error: function(xhr, textStatus, error) {
                            }
                        })
                    },5500)

                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes/batch_save',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(blob["data_inventory_eventtypes"]),
                            success: function(returneddata) {
                                // console.log("Got a return from my big update", returneddata)
                                myDeferral2.resolve()
                            },
                            error: function(){
                                // console.log("kvstore errors", arguments);
                                myDeferral2.resolve()
                            }                    
                        })
                    },6000)

                }else{
                    // console.log("Skipping data_inventory")
                }
                if(config["bookmarks"] && config["bookmarks"] == 1){
                    // console.log("Launching bookmarks")
                    let myDeferral1 = $.Deferred()
                    let myDeferral2 = $.Deferred()
                    let myDeferral3 = $.Deferred()
                    deferrals.push(myDeferral1)
                    deferrals.push(myDeferral2)
                    deferrals.push(myDeferral3)
                    
                    for(let i = 0; i < blob["bookmark"].length; i++){
                        blob["bookmark"][i]["_time"] = Math.round(Date.now() / 1000)
                        blob["bookmark"][i]["_key"] = blob["bookmark"][i]["key"]
                    }
                    for(let i = 0; i < blob["local_search_mappings"].length; i++){
                        blob["local_search_mappings"][i]["_time"] = Math.round(Date.now() / 1000)
                        blob["local_search_mappings"][i]["_key"] = blob["local_search_mappings"][i]["search_title"].replace(/[^a-zA-Z0-9]/g, "")
                    }
                    for(let i = 0; i < blob["custom_content"].length; i++){
                        blob["custom_content"][i]["_time"] = Math.round(Date.now() / 1000)
                        blob["custom_content"][i]["_key"] = blob["custom_content"][i]["showcaseId"]
                    }
                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/',
                            type: 'DELETE',
                            async: true,
                            success: function(returneddata) {
                            },
                            error: function(xhr, textStatus, error) {
                            }
                        })
                    },7500)

                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/batch_save',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(blob["bookmark"]),
                            success: function(returneddata) {
                                // console.log("Got a return from my big update", returneddata)
                                myDeferral1.resolve()
                            },
                            error: function(){
                                // console.log("kvstore errors", arguments);
                                myDeferral1.resolve()
                            }                    
                        })
                    },8000)
                    
                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/',
                            type: 'DELETE',
                            async: true,
                            success: function(returneddata) {
                            },
                            error: function(xhr, textStatus, error) {
                            }
                        })
                    },8500)

                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/local_search_mappings/batch_save',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(blob["local_search_mappings"]),
                            success: function(returneddata) {
                                // console.log("Got a return from my big update", returneddata)
                                myDeferral2.resolve()
                            },
                            error: function(){
                                // console.log("kvstore errors", arguments);
                                myDeferral2.resolve()
                            }                    
                        })
                    },9000)

                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/custom_content/',
                            type: 'DELETE',
                            async: true,
                            success: function(returneddata) {
                            },
                            error: function(xhr, textStatus, error) {
                            }
                        })
                    },9500)

                    setTimeout(function(){

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/custom_content/batch_save',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(blob["custom_content"]),
                            success: function(returneddata) {
                                // console.log console.log("Got a return from my big update", returneddata)
                                myDeferral3.resolve()
                            },
                            error: function(){
                                // console.log("kvstore errors", arguments);
                                myDeferral3.resolve()
                            }                    
                        })
                    },10000)

                }else{
                    // console.log("Skipping bookmarks")
                }
                $.when.apply($, deferrals).then(function(){

                    bustCache(true)
                    // setTimeout(function(){
                    //     location.reload()
                    // }, 4000)
                } );
            }
            function HandleAppImportUpdate(deferral){
                let versionCheck = $.Deferred();
                CheckIfESInstalled(versionCheck)
            
                $.when(versionCheck).then(function(returnObj){
                    let isOld = returnObj["isOld"]
                    let isPresent = returnObj["isPresent"]
                    let version = returnObj["version"]

                    if(isOld){
                        let update_es = $.Deferred()
                        let update_es_da = $.Deferred()
                        let update_es_main = $.Deferred()
                        $.ajax({
                            url: Splunk.util.make_full_url('/splunkd/__raw/servicesNS/nobody/SplunkEnterpriseSecuritySuite/properties/inputs/app_imports_update%3A%2F%2Fupdate_es?output_mode=json'),
                            async: true,
                            error: function(){
                                update_es.resolve({"status": "errored"})
                            },
                            success: function(returneddata) {
                                let stanza = {}
                                let status = "errored"
                                // console.log("Got the App Import Result", returneddata)
                                for(let i = 0; i < returneddata['entry'].length; i++){
                                    stanza[returneddata['entry'][i].name] = returneddata['entry'][i].content;
                                    if(returneddata['entry'][i].name == "app_regex"){
                                        if(returneddata['entry'][i].content.indexOf("Splunk_Security_Essentials") >= 0){
                                            status = "notneeded"
                                        }else{
                                            status = "needed"
                                            stanza[returneddata['entry'][i].name] = returneddata['entry'][i].content + "|(Splunk_Security_Essentials)"
                                        }
                                    }
                                }
                                update_es.resolve({"status": status, "stanza": stanza})
                            }
                        })
            
                        $.ajax({
                            url: Splunk.util.make_full_url('/splunkd/__raw/servicesNS/nobody/SplunkEnterpriseSecuritySuite/properties/inputs/app_imports_update%3A%2F%2Fupdate_es_da?output_mode=json'),
                            async: true,
                            error: function(){
                                update_es_da.resolve({"status": "errored"})
                            },
                            success: function(returneddata) {
                                let stanza = {}
                                let status = "errored"
                                // console.log("Got the App Import Result", returneddata)
                                for(let i = 0; i < returneddata['entry'].length; i++){
                                    stanza[returneddata['entry'][i].name] = returneddata['entry'][i].content;
                                    if(returneddata['entry'][i].name == "app_regex"){
                                        if(returneddata['entry'][i].content.indexOf("Splunk_Security_Essentials") >= 0){
                                            status = "notneeded"
                                        }else{
                                            status = "needed"
                                            stanza[returneddata['entry'][i].name] = returneddata['entry'][i].content + "|(Splunk_Security_Essentials)"
                                        }
                                    }
                                }
                                update_es_da.resolve({"status": status, "stanza": stanza})
                            }
                        })
                        
                        $.ajax({
                            url: Splunk.util.make_full_url('/splunkd/__raw/servicesNS/nobody/SplunkEnterpriseSecuritySuite/properties/inputs/app_imports_update%3A%2F%2Fupdate_es_main?output_mode=json'),
                            async: true,
                            error: function(){
                                update_es_main.resolve({"status": "errored"})
                            },
                            success: function(returneddata) {
                                let stanza = {}
                                let status = "errored"
                                // console.log("Got the App Import Result", returneddata)
                                for(let i = 0; i < returneddata['entry'].length; i++){
                                    stanza[returneddata['entry'][i].name] = returneddata['entry'][i].content;
                                    if(returneddata['entry'][i].name == "app_regex"){
                                        if(returneddata['entry'][i].content.indexOf("Splunk_Security_Essentials") >= 0){
                                            status = "notneeded"
                                        }else{
                                            status = "needed"
                                            stanza[returneddata['entry'][i].name] = returneddata['entry'][i].content + "|(Splunk_Security_Essentials)"
                                        }
                                    }
                                }
                                update_es_main.resolve({"status": status, "stanza": stanza})
                            }
                        })
            
                        $.when(update_es, update_es_da, update_es_main).then(function(es, es_da, es_main){
                            // reusing variable names? I know, I'm a jerk. But lots of code to code.
                            // console.log("Got status for each", es, es_da, es_main)
                            let update_es = $.Deferred()
                            let update_es_da = $.Deferred()
                            let update_es_main = $.Deferred()
                            var appscope = {}
                            appscope['owner'] = "nobody"
                            appscope['app'] = 'SplunkEnterpriseSecuritySuite';
                            appscope['sharing'] = "app";
                            let svc = splunkjs.mvc.createService();
                            let files = svc.configurations(appscope);
                            if(es.status == "needed"){
                                // console.log("Updating es App Imports Stanza", es)
                                let fileDeferred = $.Deferred();
                                let name="app_imports_update%3A%2F%2Fupdate_es";
                                files.fetch({ 'search': 'name=inputs"' }, function(err, files) {
                                    let confFile = files.item("inputs");
                                    fileDeferred.resolve(confFile)
            
                                });
                                fileDeferred.done(function(confFile) {
                                    confFile.post(name, es.stanza, function(err, stanza) {
                                        if (err) {
                                            update_es.resolve({"status": "error", "error": err, "args": arguments})
                                        } else {
                                            update_es.resolve({"status": "success", "args": arguments})
                                            return true;
                                        }
                                    })
                                });
                            }else{
                                update_es.resolve({"status": "success"});
                            }
            
                            if(es_da.status == "needed"){
                                // console.log("Updating es_da App Imports Stanza", es_da)
                                let fileDeferred = $.Deferred();
                                let name="app_imports_update%3A%2F%2Fupdate_es_da";
                                files.fetch({ 'search': 'name=inputs"' }, function(err, files) {
                                    let confFile = files.item("inputs");
                                    fileDeferred.resolve(confFile)
            
                                });
                                fileDeferred.done(function(confFile) {
                                    confFile.post(name, es_da.stanza, function(err, stanza) {
                                        if (err) {
                                            update_es_da.resolve({"status": "error", "error": err, "args": arguments})
                                        } else {
                                            update_es_da.resolve({"status": "success", "args": arguments})
                                            return true;
                                        }
                                    })
                                });
                            }else{
                                update_es_da.resolve({"status": "success"});
                            }
            
                            if(es_main.status == "needed"){
                                // console.log("Updating es App Imports Stanza", es_main)
                                let fileDeferred = $.Deferred();
                                let name="app_imports_update%3A%2F%2Fupdate_es_main";
                                files.fetch({ 'search': 'name=inputs"' }, function(err, files) {
                                    let confFile = files.item("inputs");
                                    fileDeferred.resolve(confFile)
            
                                });
                                fileDeferred.done(function(confFile) {
                                    confFile.post(name, es_main.stanza, function(err, stanza) {
                                        if (err) {
                                            update_es_main.resolve({"status": "error", "error": err, "args": arguments})
                                        } else {
                                            update_es_main.resolve({"status": "success", "args": arguments})
                                            return true;
                                        }
                                    })
                                });
                            }else{
                                update_es_main.resolve({"status": "success"});
                            }
            
                            $.when(update_es, update_es_da, update_es_main).then(function(es, es_da, es_main){
                                // console.log("Complete!", es, es_da, es_main)
                                let wereAllSuccessful = true;
                                if(es.status == "error" || es_da.status == "error" || es_main == "error"){
                                    wereAllSuccessful = false;
                                }
                                deferral.resolve(wereAllSuccessful)
                            })
                        })
                        
                    }
                })
            }
            
            
            
            
            
            function addMITREToLogReview(mystanza, deferral){
            
                var appscope = {}
                appscope['owner'] = Splunk.util.getConfigValue("USERNAME")
                appscope['app'] = 'SA-ThreatIntelligence';
                appscope['sharing'] = "global";
                var svc = splunkjs.mvc.createService();
                var files = svc.configurations(appscope);
                var fileDeferred = $.Deferred();
                let name="incident_review";
                files.fetch({ 'search': 'name=log_review"' }, function(err, files) {
                    var confFile = files.item("log_review");
                    fileDeferred.resolve(confFile)
        
                });
                fileDeferred.done(function(confFile) {
                    confFile.post(name, mystanza, function(err, stanza) {
                        if (err) {
                            deferral.resolve("error", err)
                        } else {
                            deferral.resolve("success")
                            return true;
                        }
                    })
                });
        }
        // Now we initialize the Modal itself
        var myModal = new Modal("systemConfig", {
            title: _("System Configuration").t(),
            backdrop: 'static',
            keyboard: false,
            destroyOnHide: false
        });

        myModal.$el.addClass("modal-extra-wide")

        myModal.$el.on("shown.bs.modal", function() {

            // Suggested Apps
            $("#suggested_apps").append("<p>" + _("Splunk Security Essentials leverages the capabilities of several other Splunk apps. Consider adding theser to get full value out of the app, and out of Splunk.").t() + "</p>" )
            $("#suggested_apps").append(
                $("<div>").append(
                    $("<h4>" + _("Visualizations used for SSE itself").t() + "</h4>"),
                    $('<table class=\"table\"><colgroup><col span="1" style="width: 20%"/> <col span="1" style="width: 15%"/> <col span="1" style="width: 15%"/><col span="1" style="width: 50%"/></colgroup>  <col span="1" style="width: 15%"/> <thead><tr><th>App Name</th><th>Status</th><th>Splunkbase</th><th>Notes</th></tr></thead><tbody><tr><td>Sankey</td><td id="sse-setup-app-sankey"></td><td><a href="https://splunkbase.splunk.com/app/3112/" class="external drilldown-link" target="_blank">link </td><td>Used to visualize related functionality, and connections betweens content and metadata.</td></tr><tr><td>Radar Chart</td><td id="sse-setup-app-radar"></td><td><a href="https://splunkbase.splunk.com/app/3772/" class="external drilldown-link" target="_blank">link </td><td>Used in the Analytics Advisor dashboards to track coverage of content across multiple dimensions.</td></tr></tbody></table>'),
                    $("<h4>" + _("Apps used for Analytics").t() + "</h4>"),
                    $('<table class=\"table\"><colgroup><col span="1" style="width: 20%"/> <col span="1" style="width: 15%"/> <col span="1" style="width: 15%"/><col span="1" style="width: 50%"/></colgroup><thead><tr><th>App Name</th><th>Status</th><th>Splunkbase</th><th>Notes</th></tr></thead><tbody><tr><td>URL Toolbox</td><td id="sse-setup-app-utbox"></td><td><a href="https://splunkbase.splunk.com/app/2734/" class="external drilldown-link" target="_blank">link </td><td>Enables string similarity testing, domain parsing, and basic randomness detection.</td></tr><tr><td>Machine Learning Toolkit</td><td id="sse-setup-app-mltk"></td><td><a href="https://splunkbase.splunk.com/app/2890/" class="external drilldown-link" target="_blank">link </td><td>Used by the Data Availability dashboard to analyze ingested data latency.</td></tr></tbody></table>'),
                    $("<h4>" + _("Optional apps not used in Splunk Security Essentials, but often recommended").t() + "</h4>"),
                    $('<table class=\"table\"><colgroup><col span="1" style="width: 20%"/> <col span="1" style="width: 15%"/> <col span="1" style="width: 15%"/><col span="1" style="width: 50%"/></colgroup><thead><tr><th>App Name</th><th>Status</th><th>Splunkbase</th><th>Notes</th></tr></thead><tbody><tr><td>SA-Investigator</td><td id="sse-setup-app-sa-inv"></td><td><a href="https://splunkbase.splunk.com/app/3749/" class="external drilldown-link" target="_blank">link </td><td>' + _("Tab-based dashboards that complement ES for better/faster/stronger investigation.").t() + '</td></tr><tr><td>InfoSec App</td><td id="sse-setup-app-infosec"></td><td><a href="https://splunkbase.splunk.com/app/4240/" class="external drilldown-link" target="_blank">link </td><td>' + _("Visualizations for those getting started.").t() + '</td></tr><tr><td>Enterprise Security Content Update</td><td id="sse-setup-app-escu"></td><td><a href="https://splunkbase.splunk.com/app/3449/" class="external drilldown-link" target="_blank">link </td><td>' + _("Provides Enterprise Security customers out-of-the-box content for detection, investigation, and response of security events.").t() + '</td></tr><tr><td>Lookup File Editor</td><td id="sse-setup-app-lookup"></td><td><a href="https://splunkbase.splunk.com/app/1724/" class="external drilldown-link" target="_blank">link </td><td>' + _("Easy ability to update CSV or KVStore lookups through the UI.").t() + '</td></tr><tr><td>SA-cim_validator</td><td id="sse-setup-app-sa-cim"></td><td><a href="https://splunkbase.splunk.com/app/2968/" class="external drilldown-link" target="_blank">link </td><td>' + _("The CIM Compliance checks in this app are a simplified version of SA-cim_validator.").t() + '</td></tr><tr><td>ThreatHunting</td><td id="sse-setup-app-threathunting"></td><td><a href="https://splunkbase.splunk.com/app/4305/" class="external drilldown-link" target="_blank">link </td><td>' + _("Olaf Hartong's app has a large amount of content useful for threat hunting.").t() + '</td></tr></tbody></table>')
                )
            )

            $("#scheduled_searches").on("opened", function(){
                $("#scheduled_searches").html("Processing...")
                let relevantSearches = {
                    "Generate Data Availability ML Model for Latency": {
                        "description": "Generates the nightly baseline for the Data Availability model. Only required if you have configured the Data Inventory.",
                        "desiredCron": "49 2 * * *"
                    }
                }
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/-/Splunk_Security_Essentials/saved/searches?output_mode=json&count=0',
                    type: 'GET',
                    async: true,
                    success: function(savedSearchObj) {
                        let table = $('<table class="table"><thead><tr><th>Search Name</th><th>Status</th><th>Description</th></tr></thead><tbody></tbody></table>')
                        
                        for(let i = 0; i < savedSearchObj.entry.length; i++){
                            if(relevantSearches[savedSearchObj.entry[i].name]){
                                
                                let row = $("<tr>").append($("<td>").text(savedSearchObj.entry[i].name))
                                if(savedSearchObj.entry[i].content['disabled'] == false && savedSearchObj.entry[i].content.cron_schedule.length >= 9){
                                    row.append($("<td>").text("Enabled"))
                                }else{
                                    row.append($("<td>").html("<p>Not Enabled</p>").append($('<button class="btn">Enable</button>').attr("data-desired-cron", relevantSearches[savedSearchObj.entry[i].name].desiredCron).attr("data-search-name", savedSearchObj.entry[i].name).click(function(evt){
                                        let searchName = $(evt.target).attr("data-search-name");
                                        let desiredCron = $(evt.target).attr("data-desired-cron");
                                        let statusTD = $(evt.target).closest("td")
                                        var appscope = {}
                                        appscope['owner'] = 'nobody'
                                        appscope['app'] = splunkjs.mvc.Components.getInstance("env").toJSON()['app'];
                                        appscope['sharing'] = "app";
                                        var mystanza = {}
                                        mystanza["disabled"] = "0";
                                        mystanza["cron_schedule"] = desiredCron;
                                        var svc = splunkjs.mvc.createService();
                                        var files = svc.configurations(appscope);
                                        var fileDeferred = $.Deferred();
                                        files.fetch({ 'search': 'name=savedsearches"' }, function(err, files) {
                                            var macrosFile = files.item("savedsearches");
                                            window.macrosFile = macrosFile;
                                            fileDeferred.resolve(macrosFile)

                                        });
                                        fileDeferred.done(function(macrosFile) {
                                            macrosFile.post(searchName, mystanza, function(err, stanza) {
                                                if (err) {
                                                    // console.log("Error Updating Search", err)
                                                    statusTD.html("Error Updating")
                                                    triggerError(err)
                                                } else {
                                                    // console.log("Updated")
                                                    statusTD.html("Enabled")
                                                }
                                            })
                                        });

                                        // console.log("Enabling!", searchName, desiredCron)
                                    }) ) ) 
                                }
                                row.append($("<td>").text(relevantSearches[savedSearchObj.entry[i].name].description))
                                // console.log("got it", savedSearchObj.entry[i])
                                table.find("tbody").append(row)
                            }
                        }
                        $("#scheduled_searches").html(table)
                    },
                    error: function(){
                        $("#scheduled_searches").html("Error checking search status. You can manually check the following search names:")
                        let mylist = $("<ul>")
                        for(let searchName in relevantSearches){
                            mylist.append($("<li>").text(searchName + " - " + relevantSearches[searchName].description))
                        }
                        $("#scheduled_searches").append(mylist);
                    }
                })

                
            })
            $("#content_mapped").on("opened", function(){
                $("#content_mapped").html("Processing...")
                let searchAnalysisDeferral = $.Deferred()
                CheckIfSearchesAreMapped(searchAnalysisDeferral)
                
                $.when(searchAnalysisDeferral).then(function(returnObj){

                    // TO PULL INTO PAGE GUIDE

                    let statusDiv = $("<div>")

                    let mappedStatus = $("<div>").append("<h4>" + _("Saved Search Mappings").t() + "</h4>");
                    mappedStatus.append($('<p style="color: gray">').text(_("The Bookmarked Content page allows you to pull a list of your local saved searches, and map those to either out-of-the-box content in Splunk Security Essentials, or to custom content you create. Walking through this configuration is not required, but it makes easier for you to configure all of your active content.").t()))
                    if(returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"] == 0){
                        mappedStatus.append("<p>" + _("Not Started").t() + "</p>")
                    }else if(returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"] == 1 && returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"] < returnObj["num_saved_searches"]){
                        mappedStatus.append("<p>" + Splunk.util.sprintf(_("%s saved search has been mapped (or marked as \"Not a Detection\"), out of %s total.").t(), returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"], returnObj["num_saved_searches"] ) + "</p>")
                    }else if(returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"] > 1 && returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"] < returnObj["num_saved_searches"]){
                        mappedStatus.append("<p>" + Splunk.util.sprintf(_("%s saved searches have been mapped (or marked as \"Not a Detection\"), out of %s total.").t(), returnObj["num_mapped_saved_searches"] + returnObj["num_nondetection_searches"], returnObj["num_saved_searches"] ) + "</p>")
                    }else{
                        mappedStatus.append("<p>" + Splunk.util.sprintf(_("Complete! All %s saved searches have been mapped.").t(), returnObj["num_saved_searches"]) + "</p>")
                    }
                    statusDiv.append(mappedStatus)

                    let bookmarkStatus = $("<div>").append("<h4>" + _("Bookmarks").t() + "</h4>");
                    bookmarkStatus.append($('<p style="color: gray">').text(_("Ultimately what drives the analytics advisor dashboards (which provides you the MITRE ATT&CK Matrix for your content, and the overall guide to what content is available for your data sources) and the ES integrations (pushing MITRE and Kill Chain details into the ES Incident Review dashboard, and the Risk dashboard) in Splunk Security Essentials is the concept of bookmarking. You can bookmark content that you want to remember, or you can define a status such as Active, or Needs Tuning.").t()))
                    if(returnObj["num_bookmarked_content"] == 0){
                        bookmarkStatus.append("<p>" + _("Not Started").t() + "</p>")
                    }else if(returnObj["num_bookmarked_content"] == 1 && returnObj["num_enabled_content"] == 0){
                        bookmarkStatus.append("<p>" + Splunk.util.sprintf(_("%s piece of content is bookmarked, but none have been marked as active").t(), returnObj["num_bookmarked_content"] ) + "</p>")
                    }else if(returnObj["num_bookmarked_content"] > 1 && returnObj["num_enabled_content"] == 0){
                        bookmarkStatus.append("<p>" + Splunk.util.sprintf(_("%s pieces of content are bookmarked, but none have been marked as active").t(), returnObj["num_bookmarked_content"] ) + "</p>")
                    }else if(returnObj["num_bookmarked_content"] > 0 && returnObj["num_enabled_content"] < 20){
                        bookmarkStatus.append("<p>" + Splunk.util.sprintf(_("%s pieces of content are bookmarked, and %s of those have been marked as active. This looks good, though %s is fewer searches than most organizations have. Consider marking all of your active content, or use Splunk Security Essentials to find and turn on more content.").t(), returnObj["num_bookmarked_content"], returnObj["num_enabled_content"], returnObj["num_enabled_content"] ) + "</p>")
                    }else{
                        bookmarkStatus.append("<p>" + Splunk.util.sprintf(_("%s pieces of content have been bookmarked, and %s of those have been marked as active. This looks good!").t(), returnObj["num_bookmarked_content"], returnObj["num_enabled_content"] ) + "</p>")
                    }
                    statusDiv.append(bookmarkStatus)
                    $("#content_mapped").html(statusDiv)

                        
                    // console.log("Complete", "num_saved_searches", num_saved_searches, "num_mapped_saved_searches", num_mapped_saved_searches, "num_nondetection_searches", num_nondetection_searches, "num_enabled_content", num_enabled_content, "num_bookmarked_content", num_bookmarked_content, "num_custom_content", num_custom_content)
                })
                    
            })
            
            $("#data_inventoried").on("opened", function(){
                $("#data_inventoried").html("Processing...")
                let dataInventoryAnalysis = $.Deferred()
                CheckIfDataInventoryComplete(dataInventoryAnalysis)
                // TO PULL INTO PAGE GUIDE
                $.when(dataInventoryAnalysis).then(function(returnObj){
                    let statusDiv = $("<div>")

                    let eventtypeStatus = $("<div>").append("<h4>" + _("Data Source Category Configuration").t() + "</h4>");
                    eventtypeStatus.append($('<p style="color: gray">').text(_("Data Source Categories use standardized searches to find data configured with the tags that are used in Splunk's Common Information Model.").t()))
                    if(returnObj["dsc_checked"] == 0){
                        eventtypeStatus.append("<p>" + _("Not Started").t() + "</p>")
                    }else if(returnObj["dsc_checked"] == returnObj["dsc_count"] && returnObj["dsc_count"] < 15){
                        eventtypeStatus.append("<p>" + _("Configuration invalid. Please open the status indicator on the data inventory page and click Reset Configurations.").t() + "</p>")
                    }else if(returnObj["dsc_checked"] == returnObj["dsc_count"]){
                        eventtypeStatus.append("<p>" + _("Complete!").t() + "</p>")
                    }else{
                        eventtypeStatus.append("<p>" + Splunk.util.sprintf(_("%s categories analyzed, out of %s total.").t(), returnObj["dsc_checked"], returnObj["dsc_count"] ) + "</p>")
                    }
                    statusDiv.append(eventtypeStatus)

                    let productStatus = $("<div>").append("<h4>" + _("Product Configuration").t() + "</h4>");
                    productStatus.append($('<p style="color: gray">').text(_("Whether found by looking at the result of the Data Source Category searches, by a set of standardized Splunk source / sourcetype-based searches, or you have manually configured it, the result of configuring your data inventory is a list of products, each of which maps to one or more data source categories.").t()))

                    if(returnObj["dscs_with_products"] == 0){
                        productStatus.append("<p>" + _("Not Started").t() + "</p>")
                    }else if(returnObj["products_default_checked"] == returnObj["products_default_total"]){
                        if(returnObj["products_custom_total"] == 0){
                            productStatus.append("<p>" + _("All default products are analyzed, though no custom products have been added.").t() + "</p>")
                        }else if(returnObj["products_custom_needsReview"] > 0){
                            productStatus.append("<p>" + _("All default products are analyzed, but there are products in \"Needs Review\" status.").t() + "</p>")
                        }else{
                            productStatus.append("<p>" + _("Complete! All default products are analyzed, and custom products are added!").t() + "</p>")
                        }
                    }else if(returnObj["products_custom_total"]>0){
                        productStatus.append("<p>" + Splunk.util.sprintf(_("Only found %s analyzed out of %s default products in total, but did find %s custom products are added!").t(), returnObj["products_default_checked"], returnObj["products_default_total"], returnObj["products_custom_total"]) + "</p>")
                    }else{
                        productStatus.append("<p>" + Splunk.util.sprintf(_("%s analyzed, out of %s default products in total.").t(), returnObj["products_default_checked"], returnObj["products_default_total"] ) + "</p>")
                    }
                    
                    statusDiv.append(productStatus)
                    $("#data_inventoried").html(statusDiv)

                })
            })
            
            
            $("#suggested_apps").on("opened", function(){
                let appAnalysis = $.Deferred()
                CheckWhatAppsArePresent(appAnalysis)
                $.when(appAnalysis).then(function(apps){
                    for(let app in apps){
                        if(apps[app].status == "installed"){
                            $("#" + app).text("Installed (" + apps[app].version + ")" )
                        }else{
                            $("#" + app).text("Not Installed")
                        }
                    }

                })

            })
            





            // Demo Setup
            $("#demo_setup").append($("<p>" + _("This app contains a set of demo configurations for data inventory, bookmarked, and custom content, that we can load up if you'd like.").t() + "</p>"), $('<div id="demo_setup_contents">' + _('Checking required permissions...').t() + '</div>'))
            $("#demo_setup").on("opened", function(){
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/services/authentication/current-context?output_mode=json&count=0',
                    type: 'GET',
                    async: true,
                    success: function(returneddata) {
                        // console.log("got the current auth context", returneddata)
                        window.dveuve = returneddata
                        if(returneddata.entry[0].content.capabilities.indexOf("admin_all_objects") >= 0){
                            $("#demo_setup_contents").html($("<div>").append($('<label for="demofile">Demo File (leave blank for normal)</label>'), $('<input id="demofile">'), 
                            $("<br/>"), $("<br/>"), $("<button class=\"button btn-primary\">Load Demo Data</button>").click(function(){
                                window.demo_data_file = $("#demofile").val()

                                let myModal = new Modal('confirmDemo', {
                                    title: _('Confirm Apply Demo').t(),
                                    destroyOnHide: true
                                });
                                $(myModal.$el).on("hide", function() {
                                    // Not taking any action on hide, but you can if you want to!
                                })
        
                                let body = $("<div>")
                                body.append("<p>" + _("Loading the Demo Configuration will erase all configurations on this system. Are you sure you want to continue? We will automatically create a snapshot of configuration first.").t() + "</p>")
        
                                myModal.body.html(body)
        
                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn ').text(_('Cancel').t() ).on('click', function() {
        
                                }), $('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn btn-primary').text( _('Load Demo Config').t() ).on('click', function() {
                                    $("#demo_setup_contents").html("<p>Processing...</p>")
                                    require([
                                        "jquery",
                                        "underscore",
                                        Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/ManageSnapshots.js") + "?bust=32342"
                                    ],
                                    function(
                                        $,
                                        _
                                    ) {
                                        createBookmarkOfCurrentContent("Snapshot Prior to Loading Demo")
                                        setTimeout(function(){
                                            setUpDemoConfig(window.demo_data_file)
                                        }, 1000)
                                    })
                                    
                                }))
                                myModal.show()


                            }),$("<br/>"), $("<br/>"), $("<p>").text("Importing demo data will take approximately 20 seconds, and then your browser will immediately refresh.") ))
                        }
                    },
                    error: function(xhr, textStatus, error) {
                        triggerError("Got an error pulling your permissions structure. This shouldn't happen...")
                    }
                })

            })


            $("#es_integration").on("opened", function(){
                // console.log("You just opened ES Integration")
                $("#es_integration").html('<div id="es_integration_status">' + _('Checking Status...').t() + '</div>')
                let status = $.Deferred();
                checkForMITREInLogReview(status)
                $.when(status).then(function(shouldUpdate, stanza){
                    if(shouldUpdate == "needed"){
                        $("#es_integration").attr("data-stanza", JSON.stringify(stanza)).html('<div id="es_integration_status">' + _("ES Not Configured").t() + '</div>').append(
                            $("<button>" + _("Update ES").t() + "</button>").click(function(){
                                let stanza = JSON.parse($("#es_integration").attr("data-stanza"));
                                // console.log("Going for update with stanza", stanza)
                                let updateDeferral = $.Deferred()
                                addMITREToLogReview(stanza, updateDeferral)
                                $.when(updateDeferral).then(function(status){
                                    if(status == "success"){
                                        let appImportDeferral = $.Deferred()
                                        HandleAppImportUpdate(appImportDeferral);
                                        $.when(appImportDeferral).then(function(success){
                                            if(success){
                                                $("#es_integration").html('<div id="es_integration_status">Configuration set (it may take up to a minute to take effect). Once you have mapped your content in Bookmarked Content, you will see any Kill Chain or MITRE mappings in ES.</div>' )
                                            }else{
                                                $("#es_integration").html('<div id="es_integration_status">Error configuring (or checking the configuration). You must have admin rights on Splunk in order to complete this operation -- if you have admin rights and still see this error, please reach out for support on Splunk Answers.</div>' )
                                            }
                                        })
                                    }else{
                                        $("#es_integration").html( _('<div id="es_integration_status">Error applying the change. We recommend updating the fields directly though ES (<a href="">link</a>). If you are using ES prior to 5.3, you will also need to add Splunk Security Essentials to the app imports (<a href="https://docs.splunk.com/Documentation/ES/5.2.0/Install/ImportCustomApps">docs</a>, <a href="/manager/SplunkEnterpriseSecuritySuite/data/inputs/app_imports_update">link).</div>').t() )
                                    }
                                })
                            })
                        )
                    }else if(shouldUpdate == "errored"){
                        $("#es_integration").html( _('<div id="es_integration_status">Error checking log_review.conf settings. This does not appear to be an ES environment.</div>').t() )
                    }else if(shouldUpdate == "notneeded"){
                        $("#es_integration").html( _('<div id="es_integration_status">Already Configured! If you are running into issues, please ask for support on Splunk Answers.</div>').t())
                    }
                })
            })
            $("#systemConfig").css("display", "none");
            $(".modal-backdrop:not([id])").attr("id", "systemConfigBackdrop").css("display", "none");
        })
        let navItems = {
            "enabledApps": {
                "name": "Enabled Apps / Channels",
                "content": "<div id=\"content_sources\"></div>"
            },
            "requiredApps": {
                "name": "Suggested Apps",
                "content": "<div id=\"suggested_apps\"></div>"
            },
            "esIntegration": {
                "name": "ES Integration",
                "content": "<div id=\"es_integration\"></div>"
            },
            "contentMapped": {
                "name": "Content Mapping",
                "content": "<div id=\"content_mapped\"></div>"
            },
            "dataInventoried": {
                "name": "Data Inventory",
                "content": "<div id=\"data_inventoried\"></div>"
            },
            "enabledSearch": {
                "name": "Scheduled Searches",
                "content": "<div id=\"scheduled_searches\"></div>"
            }
        }
        
        for(let i = 0; i < appConfig.length; i++){
            if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                navItems["demoConfig"] = {
                    "name": "Demo Environment Setup",
                    "content": "<div id=\"demo_setup\"></div>"
                }
            }
        }
    
        ////// START
        let output = $("<div class=\"main_output\"></div>")
        let sysconfignav = $('<div class="system_config_nav"></div>')
        let mainBlock = $('<div class="sysconfig_main"  style="width: 100%">').html('<div class="sysconfig_header"></div>').append('<div class="sysconfig_body"><h3>' + _("Configuration").t() + '</h3>' + _('Welcome to the Splunk Security Essentials Configuration menu. Find configuration options in the menu to the left.').t() + '</div>')
        for(let item in navItems){
            $(".sysconfig_header").remove()
            let navitem = $('<div class="sysconfig_item" status="">').attr("data-item", item).click(function(evt){
                let item = $(evt.target).closest("div.sysconfig_item").attr("data-item")
                // console.log("Trying to show", item, evt.target)
                $(".sysconfig_item_active").removeClass("sysconfig_item_active")
                $("div.sysconfig_item[data-item=" + item + "]").addClass("sysconfig_item_active")
                $("div.sysconfig_body").hide()
                $("div.sysconfig_body[data-item=" + item + "]").show()
                $("div.sysconfig_body[data-item=" + item + "]").children(":last").trigger("opened")  
            })
            //let statusText = $('<div style="position: relative;">').html(buildStatusIcon(eventtype.status))
            navitem.append($('<div class="sysconfig_status">').append(/*statusText*/))
            navitem.append($("<h3>").text(navItems[item]['name']))
            sysconfignav.append(navitem)

            let main_container = $('<div class="sysconfig_body" style="display: none;">').attr("data-item", item)

            let header = $('<div class="sysconfig_header">')
            header.append($("<h3>").text(navItems[item]['name']))
            main_container.html(header)
            main_container.append(navItems[item]['content'])
            mainBlock.append(main_container)
        }
        
        output.append(sysconfignav, mainBlock)

            ////// COMPLETE
        myModal.body.html(output).css("min-height", "300px")

        myModal.footer.append($('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn ').text('Close').on('click', function() {
            $("#systemConfig").css("display", "none");
            $("#systemConfigBackdrop").css("display", "none");
        }))
        myModal.show(); // Launch it!
        function triggerUpdateAvailable(elementUpdated){
            // $("#sysConfigButton").tooltip('destroy')
            let elements = elementUpdated;
            
            if($("#launchConfigurationLink").attr("data-status") == "elementUpdated"){
                current = $("#launchConfigurationLink").attr("data-original-title").replace("Update Available For: ", "").split(", ")
                current.push(elementUpdated)
                elements = current.join(", ")
            }
            $("#launchConfigurationLink").attr("data-placement", "bottom").css("background-color", "#00950E").css("color", "white").attr("data-status", "elementUpdated").append('<i class="icon-rotate" style="font-size: 16pt">').attr("title", "Update Available For: " + elements).tooltip().unbind("click").click(function(){
                location.reload()
            })
        }
        $.ajax({
            url: Splunk.util.make_full_url('/splunkd/__raw/servicesNS/nobody/' + splunkjs.mvc.Components.getInstance("env").toJSON()['app'] + '/properties/essentials_updates?output_mode=json'),
            async: true,
            success: function(returneddata) {
                let deferralStack = []
                // console.log("Here's my overall...", returneddata)
                for (let i = 0; i < returneddata.entry.length; i++) {
                    let name = returneddata.entry[i].name
                    let localDeferral = $.Deferred()
                    deferralStack.push(localDeferral)
                    $.ajax({
                        url: Splunk.util.make_full_url('/splunkd/__raw/servicesNS/nobody/' + splunkjs.mvc.Components.getInstance("env").toJSON()['app'] + '/configs/conf-essentials_updates/' + name + '?output_mode=json'),
                        //url: '/splunkd/__raw/servicesNS/nobody/' + splunkjs.mvc.Components.getInstance("env").toJSON()['app'] + '/properties/essentials_updates/' + name + '/value?output_mode=json',
                        async: true,
                        success: function(returneddata) {
                            let content = returneddata.entry[0].content;
                            
                            let obj = $("<div class=\"configObject\"></div>")
                            let checkedtext = " checked"
                            // console.log("Evaluating", content)
                            if (content.order && (content.order == "-1" || content.order == -1)) {
                                if(content.type == "mitre"){
                                    // console.log("got a mitre update", content)
                                    setTimeout(function(){

                                        require([
                                            'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/external_content/?query={"_key": "' + content.channel + '"}'
                                            ], function(external_content){
                                                
                                                // console.log("Here's my notes..", external_content[0]['last_checked'], Date.now()/1000 - parseInt(external_content[0]['last_checked']), parseInt(external_content[0]['last_checked']), content, external_content[0])
                                            if(external_content.length > 0 && external_content[0]['last_checked'] && Date.now()/1000 - parseInt(external_content[0]['last_checked']) < 3600*24){
                                                // console.log("We recently checked, skipping this time.", content);
                                                return;
                                            }
                                            $.ajax({
                                                url: content.content_download_url,
                                                type: 'GET',
                                                async: true,
                                                success: function(newdata) {
                                                    // console.log("Checking", content.channel, content);
                                                    let new_build_id = newdata.length;
                                                    newdata = JSON.parse(newdata);
                                                    // console.log("Got data", newdata)
                                                    window.dvtest = newdata
                                                    let found = false
                                                    // console.log("Got an external_content_library", external_content)
                                                    for(let i = 0; i < external_content.length; i++){
                                                        // console.log("Looking for a match", external_content[i].channel , content.channel , external_content[i].build , new_build_id)
                                                        if(external_content[i].channel == content.channel && external_content[i].build != new_build_id){
                                                            
                                                            found = true
                                                            let build_object = external_content[i];
                                                            // console.log("Found the build object for", content.channel, build_object, "updating build to", new_build_id);
                                                            build_object['build'] = new_build_id;
                                                            build_object['last_checked'] = Date.now()/1000;
                                                            let build_id_update = $.Deferred();
                                                            let content_update = $.Deferred();
                                                            let jsonstorage = {
                                                                "_key": content.channel,
                                                                "version": new_build_id,
                                                                "description": content.description,
                                                                "json": JSON.stringify(newdata)
                                                            }
                                                            $.ajax({
                                                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_json_doc_storage/' + content.channel,
                                                                type: 'POST',
                                                                contentType: "application/json",
                                                                async: true,
                                                                data: JSON.stringify(jsonstorage),
                                                                success: function(returneddata) {
                                                                    bustCache();
                                                                    content_update.resolve()
                                                                    
                                                                }
                                                            })
                                                            $.ajax({
                                                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/external_content/' + build_object['_key'],
                                                                type: 'POST',
                                                                contentType: "application/json",
                                                                async: true,
                                                                data: JSON.stringify(build_object),
                                                                success: function(returneddata) {
                                                                    bustCache();
                                                                    build_id_update.resolve()
                                                                    
                                                                }
                                                            })
                                                            $.when(build_id_update, content_update).then(function(){
                                                                triggerUpdateAvailable(content.name);
                                                            })
                                                            // post update
                                                        }else if(external_content[i].channel == content.channel && external_content[i].build == new_build_id){
                                                            found = true;
                                                            // console.log("Found the same build id for", content.channel)
                                                            let build_object = external_content[i];
                                                            build_object['last_checked'] = Date.now()/1000;
                                                            $.ajax({
                                                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/external_content/' + build_object['_key'],
                                                                type: 'POST',
                                                                contentType: "application/json",
                                                                async: true,
                                                                data: JSON.stringify(build_object),
                                                                success: function(returneddata) {
                                                                    
                                                                }
                                                            })
                                                        }
                                                    }
                                                    if(! found){
                                                        let build_object = {
                                                            "_key": content.channel,
                                                            "first_checked": Date.now()/1000,
                                                            "last_checked": Date.now()/1000,
                                                            "last_updated": Date.now()/1000,
                                                            "channel": content.channel,
                                                            "build": new_build_id
                                                        }
                                                        let build_id_update = $.Deferred();
                                                        let content_update = $.Deferred();
                                                        let jsonstorage = {
                                                            "_key": content.channel,
                                                            "version": new_build_id,
                                                            "description": content.description,
                                                            "json": JSON.stringify(newdata)
                                                        }
                                                        $.ajax({
                                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_json_doc_storage',
                                                            type: 'POST',
                                                            contentType: "application/json",
                                                            async: true,
                                                            data: JSON.stringify(jsonstorage),
                                                            success: function(returneddata) {
                                                                bustCache();
                                                                content_update.resolve()
                                                            },
                                                            error: function(returneddata) {
                                                                bustCache();
                                                                content_update.resolve()
                                                            }
                                                        })
                                                        $.ajax({
                                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/external_content',
                                                            type: 'POST',
                                                            contentType: "application/json",
                                                            async: true,
                                                            data: JSON.stringify(build_object),
                                                            success: function(returneddata) {
                                                                bustCache();
                                                                build_id_update.resolve()
                                                            },
                                                            error: function(returneddata) {
                                                                bustCache();
                                                                build_id_update.resolve()
                                                            }
                                                        })
                                                        $.when(build_id_update, content_update).then(function(){
                                                            triggerUpdateAvailable(content.name);
                                                        })
                                                        // console.log("Found no build object -- initializing one for", content.channel, build_object)
                                                    }
                                                },
                                                error: function(xhr, textStatus, error) {
                                                                // console.log("Error Updating!", xhr, textStatus, error)
                                                }
                                            })
                                        })
                                    },4000)
                                }
                                return;
                            }
                            // console.log("APPUPDATE: Looking at app", content.channel, content, content.content_download_url)
                            if(content.type == "app" && content.content_download_url && content.content_download_url!="" && ! content.disabled){
                                // console.log("APPUPDATE: Working on updating!", content.channel, content, content.content_download_url)
                                if(content.build_url && content.build_url.indexOf("SPLUNKD") == 0){
                                    content.build_url = Splunk.util.make_full_url(content.build_url.replace("SPLUNKD", ""))
                                }
                                if(content.content_download_url && content.content_download_url.indexOf("SPLUNKD") == 0){
                                    content.content_download_url = Splunk.util.make_full_url(content.content_download_url.replace("SPLUNKD", ""))
                                    // console.log("Got a replacement content_download_url", content.content_download_url)
                                }
                                let runUpdate = $.Deferred()
                                // console.log("Checking for updates..", content, external_content)
                                let shouldUpdate = true;
                                let lastBuild = ""
                                let buildObj = {}
                                let newBuild = ""
                                for(let i = 0; i < external_content.length; i++){
                                    if(external_content[i].channel == content.channel){
                                        if(! external_content[i].last_updated || external_content[i].last_updated == "" || external_content[i].last_updated < (new Date).getTime()/1000 - 24*3600){
                                            shouldUpdate = true;
                                        }else{
                                            shouldUpdate = false;
                                        }
                                        if(external_content[i].build){
                                            lastBuild = external_content[i].build
                                            buildObj = external_content[i]
                                        }
                                    }
                                }
                                // console.log("CONTENTUPDATE - lastBuild and buildObj and etc.", lastBuild, buildObj)
                                if(Object.keys(buildObj).length == 0){
                                    buildObj = {
                                        "_key": content.channel,
                                        "first_checked": Date.now()/1000,
                                        "last_checked": Date.now()/1000,
                                        "last_updated": Date.now()/1000,
                                        "channel": content.channel,
                                        "build": ""
                                    }
                                }

                                if(shouldUpdate){
                                    // console.log("APPUPDATE: Pulling!", content.channel, content, content.content_download_url)
                                    setTimeout(function(){ // Delaying 3 seconds
                                        if(content.build_url && content.build_url!="" && content.build_field && content.build_field!=""){
                                            $.ajax({
                                                url: content.build_url,
                                                type: 'GET',
                                                async: true,
                                                timeout: 1000,
                                                success: function(returneddata) {
                                                    try{
                                                        let obj = returneddata;
                                                        if(typeof obj == "string"){
                                                            obj = JSON.parse(obj)
                                                        }
                                                        if(obj[content.build_field]){
                                                            if(lastBuild != obj[content.build_field]){
                                                                runUpdate.resolve()
                                                            }
                                                        }else{
                                                            runUpdate.resolve()
                                                        }
                                                    }catch(error){
                                                        runUpdate.resolve()
                                                    }
                                                },
                                                error: function(xhr, textStatus, error) {
                                                    runUpdate.resolve()
                                                }
                                            })
                                        }else{
                                            runUpdate.resolve()
                                        }
                                        $.when(runUpdate).then(function(){
                                            if(content.content_download_url.indexOf("LOCALIZATIONSCHEME")){
                                                content.content_download_url = content.content_download_url.replace("LOCALIZATIONSCHEME", $C['LOCALE'])
                                            }
                                                            
                                            $.ajax({
                                                url: content.content_download_url,
                                                type: 'GET',
                                                async: true,
                                                timeout: 1000,
                                                success: function(returneddata) {
                                                    // console.log("Got New Content to Merge", returneddata)
                                                    if(typeof returneddata == "string"){
                                                        try{
                                                            returneddata = JSON.parse(returneddata);
                                                        }catch(error){
                                                            return;
                                                        }
                                                    }
                                                    
                                                    if(newBuild == ""){
                                                        newBuild = JSON.stringify(returneddata).length;
                                                        if(newBuild == lastBuild){
                                                            // console.log("CONTENTUPDATE - newBuild == lastBuild", lastBuild, buildObj, newBuild, content)
                                                            return true;
                                                            
                                                        }
                                                    }
                                                    // console.log("CONTENTUPDATE - newBuild lastBuild and buildObj and etc.", lastBuild, buildObj, newBuild, content)
                                                    buildObj.build = newBuild
                                                    buildObj.last_updated = Date.now()/1000
                                                    let build_id_update = $.Deferred();
                                                    let content_update = $.Deferred();
                                                    $.ajax({
                                                        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/external_content/batch_save',
                                                        type: 'POST',
                                                        contentType: "application/json",
                                                        async: true,
                                                        data: JSON.stringify([buildObj]),
                                                        success: function(returneddata) {
                                                            build_id_update.resolve()
                                                        },
                                                        error: function(returneddata) {
                                                            build_id_update.resolve()
                                                        }
                                                    })
                                                    let showcasesToUpdate = []
                                                    for(let showcase in returneddata){
                                                        //_key, _time, showcaseId, channel, local_json, json, user
                                                        let summary = returneddata[showcase];
                                                        let valid = true;
                                                        let requiredNonNullFields = ["name", "description", "dashboard", "journey", "usecase", "category"]
                                                        let missingOrInvalidFields = []
                                                        for(let i = 0; i < requiredNonNullFields.length; i++){
                                                            if(! summary[requiredNonNullFields[i]] || summary[requiredNonNullFields[i]]==""){
                                                                valid = false;
                                                                missingOrInvalidFields.push(requiredNonNullFields[i])
                                                            }
                                                        }
                                                        if(valid){
                                                            let id= showcase;
                                                            let myChannel = "";
                                                            if(summary.app){
                                                                myChannel = summary.app;
                                                            }else if(summary.channel){
                                                                myChannel = summary.channel;
                                                            }
                                                            
                                                            showcasesToUpdate.push({
                                                                _key: summary.id,
                                                                _time: Date.now() / 1000,
                                                                showcaseId: id,
                                                                channel: myChannel,
                                                                user: "AutomaticallyDownloaded",
                                                                json: JSON.stringify(summary)
                                                            })
                                                        }else{
                                                            // console.log("Got invalid fields for downloaded content", missingOrInvalidFields, summary)
                                                        }
                                                    }
                                                    if(showcasesToUpdate.length > 0){
    
                                                        $.ajax({
                                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/custom_content/batch_save',
                                                            type: 'POST',
                                                            contentType: "application/json",
                                                            async: true,
                                                            data: JSON.stringify(showcasesToUpdate),
                                                            success: function(returneddata) {
                                                                content_update.resolve()
                                                            },
                                                            error: function(returneddata) {
                                                                // content_update.resolve()
                                                            }
                                                        })
                                                    }
    
                                                    $.when(build_id_update, content_update).then(function(){
                                                        triggerUpdateAvailable(content.name);
                                                    })
                                                    
                                                },
                                                error: function(xhr, textStatus, error) {
                                                    // console.log("Didn't get any new content")
                                                    // customSummaryInfo.roles.default.summaries = Object.keys(customSummaryInfo.summaries)
                                                    // LaunchExportDialog(customSummaryInfo, wereKeysDeleted)
                                                }
                                            })
                                        })
                                    },4000)
                                }
                            }
                            if (content.disabled) {
                                checkedtext = ""
                                if (content.default != "disabled") {
                                    $("#launchConfigurationLink").css("background-color", "#050")
                                }

                            } else {
                                if (content.default == "disabled") {
                                    $("#launchConfigurationLink").css("background-color", "#050")
                                }
                            }
                            obj.append('<div class="tooltipcontainer  filterItem" style="width: 100%"><label class="filterswitch">' + '<input type="checkbox" ' + /* onclick="console.log(this)"*/ ' id="FILTER_' + name + '" name="FILTER_' + name + '"' + checkedtext + '><span class="filterslider "></span></label><div class="filterLine"><b>' + content.name + '</b>' + (content.description ? (": " + content.description) : "") + '</div></div> ')

                            if (content.default) {
                                obj.find("input").attr("data-default", content.default)
                            }
                            if (content.order) {
                                obj.attr("data-order", content.order)
                                obj.attr("data-name", name)
                            } else {
                                obj.attr("data-order", "99")
                                obj.attr("data-name", name)
                            }
                            if (content.build_url && content.build_url != "" && content.build_url != null && content.content_download_url && content.content_download_url != "" && content.content_download_url != null) {
                                //obj.find("input").attr("data-build_url", content.build_url).attr("data-content_download_url", content.content_download_url)
                                checkContentVersion(content);
                            }
                            obj.find("input").attr("data-name", name).attr("data-obj", JSON.stringify(content)).click(function(evt) {
                                let target = $(evt.target);
                                if (target.is(":checked")) {
                                    updateEssentials(target.attr("data-name"), "false")
                                } else {
                                    updateEssentials(target.attr("data-name"), "true")
                                }
                            })
                            $("#content_sources").append(obj);



                            
                            localDeferral.resolve()
                        },
                        error: function(xhr, textStatus, error) {
                            console.error("Error 2!", xhr, textStatus, error);

                        }
                    });
                }
                $.when.apply($, deferralStack).then(function() {
                    let desiredObjects = []
                    for (let i = 0; i < $("div.configObject[data-order]").length; i++) {
                        desiredObjects.push({
                            name: $($("div.configObject[data-order]")[i]).attr("data-name"),
                            order: $($("div.configObject[data-order]")[i]).attr("data-order")
                        })
                    }
                    desiredObjects.sort(function(a, b) {

                        if (a.order > b.order) {
                            return 1;
                        }
                        if (a.order < b.order) {
                            return -1;
                        }
                        return 0;
                    });
                    let container = $("div.configObject[data-order]").first().parent();
                    for (let i = 0; i < desiredObjects.length; i++) {
                        $("div.configObject[data-name=" + desiredObjects[i].name + "]").appendTo(container)
                    }
                })
            },
            error: function(xhr, textStatus, error) {
                console.error("Error 1!", xhr, textStatus, error);

            }
        });
        setTimeout(function(){        
            $.ajax({
                url: 'https://www.splunksecurityessentials.com/partners',
                type: 'GET',
                async: true,
                success: function(returneddata) {
                    // No 404! Let's do it...
                    $("#content_sources").prepend($("<p>Splunk Security Essentials ships with a variety of content from Splunk apps, but also can be expanded with additional partner content. You may enable or disable any content sources below.</p><p>To look for new content sources, <a href=\"https://www.splunksecurityessentials.com/partners\" target=\"_blank\" class=\"external drilldown-link\">browse here</a>.</p>"))
                },
                error: function(xhr, textStatus, error) {
                    // No action, 'cause we have a 404 on the partners page.
                }
            })
        }, 1000)
        
        // $(".dashboard-view-controls").prepend($('<button id="sysConfigButton" class="button btn" style="margin-right: 4px; height: 32px;" href="#" ><i class="icon-gear" style="font-size: 24px" /></button>').click(function() {
        //     $("#systemConfig").css("display", "block");
        //     $("#systemConfigBackdrop").css("display", "block");

        // }))

        function checkContentVersion(content) {

        }

        function updateEssentials(name, isEnabled) {
            var appscope = {}
            appscope['owner'] = Splunk.util.getConfigValue("USERNAME")
            appscope['app'] = splunkjs.mvc.Components.getInstance("env").toJSON()['app'];
            appscope['sharing'] = "app";
            var mystanza = {}
            mystanza["disabled"] = isEnabled;
            var svc = splunkjs.mvc.createService();
            var files = svc.configurations(appscope);
            var fileDeferred = $.Deferred();
            files.fetch({ 'search': 'name=essentials_updates"' }, function(err, files) {
                var macrosFile = files.item("essentials_updates");
                window.macrosFile = macrosFile;
                fileDeferred.resolve(macrosFile)

            });
            fileDeferred.done(function(macrosFile) {
                macrosFile.post(name, mystanza, function(err, stanza) {
                    if (err) {} else {
                        return true;
                    }
                })
            });

            if ($("#systemConfig").find("input:not(:checked):not([data-default=disabled])").length + $("#systemConfig").find("input[data-default=disabled]:checked").length == 0) {
                $("#sysConfigButton").removeClass("btn-primary")
            } else {
                $("#sysConfigButton").addClass("btn-primary")
            }
            if ($("#systemConfig").find(".modal-footer").find("button.btn").attr("data-isrefreshset") != "yes") {
                $("#systemConfig").find(".modal-footer").find("button.btn").attr("data-isrefreshset", "yes").text( _("Refresh Page").t()).click(function() {
                    location.reload()
                })
                $("#systemConfig").find(".modal-header").find(".close").click(function() {
                    location.reload()
                })

            }
        }

    })
}, 1000)