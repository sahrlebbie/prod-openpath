function customContentModal(successCallback, summary, potentialExtractions) {

    require([
        'underscore',
        'json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=data_inventory&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitreattack&locale=' + window.localeString,
        'json!' + $C['SPLUNKD_PATH'] + '/services/pullJSON?config=mitrepreattack&locale=' + window.localeString,
        "components/controls/Modal"
    ], function(
        _,
        localShowcaseInfo,
        data_inventory,
        mitre_attack,
        mitre_preattack,
        Modal) {



        function handleNewContentTelemetry(status, obj){
            let allowedKeys = ["mitre_technique", "mitre_tactic", "killchain", "usecase", "category", "data_source_categories"]
            let record = {"status": status}
            for(let i = 0; i <  allowedKeys.length; i++){
                if(obj[allowedKeys[i]] && obj[allowedKeys[i]]!=""){
                    record[allowedKeys[i]] = obj[allowedKeys[i]]
                }
            }
            // console.log("ADDING TELEMETRY", "CustomContentCreated", record)
            require(["components/data/sendTelemetry", 'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/sse_app_config'], function(Telemetry, appConfig) {
                for(let i = 0; i < appConfig.length; i++){
                    if(appConfig[i].param == "demoMode" && appConfig[i].value == "true"){
                         record.demoMode = true
                    }
                }
                Telemetry.SendTelemetryToSplunk("CustomContentCreated", record)
            })
        }




        if($("#newCustom").length > 0){
            $("#newCustom").modal("hide")
        }


        var newCustomModal = new Modal('newCustom', {
            title: 'Add Custom Content',
            destroyOnHide: true,
            type: 'wide'
        });
        var dataSources = ""
        var myKeys = Object.keys(window.allDataSources).sort()
        for (var i = 0; i < myKeys.length; i++) {
            if (myKeys[i] != "Other")
                dataSources += '<option value="' + myKeys[i] + '">' + myKeys[i] + '</option>'
        }
        dataSources += '<option value="Other">Other</option>'
        var myBody = $('<table class="object">\
            <tbody>\
                <tr>\
                    <tr><td colspan="2"><h2>' + _('Required Fields').t() + '</h2></td></tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_16" class="required">' + _('Name').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="name" type="text" id="BrutusinForms#0_16" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The name of the example, e.g. "New Local Admin Account." You should have a maximum of 150 characters, and avoid crazy punctuation.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#inSplunk" class="required">' + _('Solved in Splunk').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <div><input type="radio" name="inSplunk" value="yes" data-field="inSplunk" id="BrutusinForms#inSplunk" class="   " title="" checked> ' + _('Solved In Splunk').t() + '</div>\
                        <div><input type="radio" name="inSplunk" value="no" data-field="inSplunk" id="BrutusinForms#inSplunk" class="   " title=""> ' + _('Solved Outside of Splunk').t() + '</div>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('If you would like to track functionality that exists in your environment, but exists outside the realm of Splunk (for example, Carbon Black detection rules tied to specific MITRE ATT&CK tactics), you can mark it as outside of Splunk here.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#bookmarked" class="required">' + _('Bookmarked Status').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="bookmark_status" id="BrutusinForms#bookmarked"\
                            class="   " title="" >\
                            <option value="none">' + _('Not Bookmarked').t() + '</option>\
                            <option value="bookmarked" selected>' + _('Bookmarked').t() + '</option>\
                            <option value="needData">' + _('Waiting On Data').t() + '</option>\
                            <option value="inQueue">' + _('Ready for Deployment').t() + '</option>\
                            <option value="issuesDeploying">' + _('Deployment Issues').t() + '</option>\
                            <option value="needsTuning">' + _('Needs Tuning').t() + '</option>\
                            <option value="successfullyImplemented">' + _('Successfully Implemented').t() + '</option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Bookmark Status is how SSE tracks content, either simply "bookmarked" or even tracking implementation status, e.g. "Waiting On Data" or "Successfully Implemented."').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_13" class="required">' + _('Journey').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="journey" id="BrutusinForms#0_13"\
                            class="   " title="" >\
                            <option value="Stage_1">Stage_1\
                            </option>\
                            <option value="Stage_2">Stage_2\
                            </option>\
                            <option value="Stage_3">Stage_3\
                            </option>\
                            <option value="Stage_4">Stage_4\
                            </option>\
                            <option value="Stage_5">Stage_5\
                            </option>\
                            <option value="Stage_6">Stage_6\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The stage of the journey that this content will appear in.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_22" class="required">' + _('Use Case').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="usecase" id="BrutusinForms#0_22"\
                            class="   " title="" >\
                            <option value=""></option>\
                            <option value="Security Monitoring">' + _('Security Monitoring').t() + '\
                            </option>\
                            <option value="Advanced Threat Detection">' + _('Advanced Threat Detection').t() + '\
                            </option>\
                            <option value="Insider Threat">' + _('Insider Threat').t() + '\
                            </option>\
                            <option value="Compliance">' + _('Compliance').t() + '\
                            </option>\
                            <option value="Application Security">' + _('Application Security').t() + '\
                            </option>\
                            <option value="Other">' + _('Other').t() + '\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_9" class="required">' + _('Featured').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="highlight" id="BrutusinForms#0_9"\
                            class="   " title="" >\
                            <option value="No">' + _('No').t() + '\
                            </option>\
                            <option value="Yes">' + _('Yes').t() + '\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Should this show up as a featured example on the main page. When we build content, we target having approximately 15% of the content be featured, just the most prominent, highest value content.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_1" class="required">' + _('Alert Volume').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="alertvolume" id="BrutusinForms#0_1"\
                            class="   " title="" >\
                            <option value=""></option>\
                            <option value="Very High">' + _('Very High').t() + '\
                            </option>\
                            <option value="High">' + _('High').t() + '\
                            </option>\
                            <option value="Medium">' + _('Medium').t() + '\
                            </option>\
                            <option value="Low">' + _('Low').t() + '\
                            </option>\
                            <option value="Very Low">' + _('Very Low').t() + '\
                            </option>\
                            <option value="Other">' + _('Other').t() + '\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Is this a high volume search that will create lots of noise, or a low volume / high fidelity search that a human could handle the results of?').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#severity" class="required">' + _('Severity').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="severity" id="BrutusinForms#severity"\
                        class="   " title="" >\
                        <option value=""></option>\
                        <option value="Very High">' + _('Very High').t() + '\
                        </option>\
                        <option value="High">' + _('High').t() + '\
                        </option>\
                        <option value="Medium">' + _('Medium').t() + '\
                        </option>\
                        <option value="Low">' + _('Low').t() + '\
                        </option>\
                        <option value="Very Low">' + _('Very Low').t() + '\
                        </option>\
                        <option value="Other">' + _('Other').t() + '\
                        </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Impact indicates the severity of this event when it fires. It is not directly surfaced in the UI today, but is available as an enrichment field via the | sseanalytics search command or the scripted lookup.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#category"  class="required">' + _('Category').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <select data-field="category" id="BrutusinForms#category"\
                            class="   " title="" >\
                            <option value=""></option>\
                            <option value="Abuse">' + _('Abuse').t() + '</option>\
                            <option value="Account Compromise">' + _('Account Compromise').t() + '</option>\
                            <option value="Account Sharing">' + _('Account Sharing').t() + '</option>\
                            <option value="Adversary Tactics">' + _('Adversary Tactics').t() + '</option>\
                            <option value="Best Practices">' + _('Best Practices').t() + '</option>\
                            <option value="Cloud Security">' + _('Cloud Security').t() + '</option>\
                            <option value="Command and Control">' + _('Command and Control').t() + '</option>\
                            <option value="Compliance">' + _('Compliance').t() + '</option>\
                            <option value="Data Exfiltration">' + _('Data Exfiltration').t() + '</option>\
                            <option value="Denial of Service">' + _('Denial of Service').t() + '</option>\
                            <option value="Endpoint Compromise">' + _('Endpoint Compromise').t() + '</option>\
                            <option value="GDPR">' + _('GDPR').t() + '</option>\
                            <option value="IAM Analytics">' + _('IAM Analytics').t() + '</option>\
                            <option value="Insider Threat">' + _('Insider Threat').t() + '</option>\
                            <option value="Lateral Movement">' + _('Lateral Movement').t() + '</option>\
                            <option value="Malware">' + _('Malware').t() + '</option>\
                            <option value="Network Attack">' + _('Network Attack').t() + '</option>\
                            <option value="Operations">' + _('Operations').t() + '</option>\
                            <option value="Other">' + _('Other').t() + '</option>\
                            <option value="Privilege Escalation">' + _('Privilege Escalation').t() + '</option>\
                            <option value="Ransomware">' + _('Ransomware').t() + '</option>\
                            <option value="SaaS">' + _('SaaS').t() + '</option>\
                            <option value="Scanning">' + _('Scanning').t() + '</option>\
                            <option value="Shadow IT">' + _('Shadow IT').t() + '</option>\
                            <option value="Threat Intelligence">' + _('Threat Intelligence').t() + '</option>\
                            <option value="Unauthorized Software">' + _('Unauthorized Software').t() + '</option>\
                            <option value="Vulnerability">' + _('Vulnerability').t() + '</option>\
                            <option value="Web Attack">' + _('Web Attack').t() + '</option>\
                        </select>\
                    </td>\
                </tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#dsc" class="required">' + _('Data Source Category or Categories').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                    </td>\
                </tr>\
                <tr><td colspan="2"><div id="data_source_categories"></div></td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_4" class="required">' + _('Description').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="description" id="BrutusinForms#0_4" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('This is the key description of your custom content. Should generally be under 250-300 characters.').t() + '</td></tr>\
                <!--<tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_5" class="required">' + _('App Display Name').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="displayapp" default="Splunk Security Essentials" type="text" id="BrutusinForms#0_5" class=" " value="Splunk Security Essentials">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The display name of the app that provides this content (frequently Splunk Security Essentials).').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_5" class="required">' + _('App Real Name').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="displayapp" default="Splunk_Security_Essentials" type="text" id="BrutusinForms#0_5" class=" " value="Splunk_Security_Essentials">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The app ID of the app that provides this content (frequently Splunk_Security_Essentials).').t() + '</td></tr>\
                --></tbody></table>\
                <table class="dvexpand table table-chrome"><thead><tr><th colspan="2" class="expands">\
                <h2 style="line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;"><a href="#" class="dropdowntext" style="color: black;" onclick=\'$("#customContentMetadata").toggle(); if($("#customContentMetadata_arrow").attr("class")=="icon-chevron-right"){$("#customContentMetadata_arrow").attr("class","icon-chevron-down"); $("#customContentMetadata_table").addClass("expanded"); $("#customContentMetadata_table").removeClass("table-chrome");  $("#customContentMetadata_table").find("th").css("border-top","1px solid darkgray");  }else{$("#customContentMetadata_arrow").attr("class","icon-chevron-right");  $("#customContentMetadata_table").removeClass("expanded");  $("#customContentMetadata_table").addClass("table-chrome"); } return false;\'>&nbsp;&nbsp;<i id="customContentMetadata_arrow" class="icon-chevron-right"></i>\
                Metadata Fields</a></h2></th></tr></thead><tbody style="display: none" id="customContentMetadata">\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_6" class="">' + _('Security Domain').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="domain" id="BrutusinForms#0_6"\
                            class="   " title="" >\
                            <option value=""></option>\
                            <option value="Access">' + _('Access').t() + '\
                            </option>\
                            <option value="Audit">' + _('Audit').t() + '\
                            </option>\
                            <option value="Data">' + _('Data').t() + '\
                            </option>\
                            <option value="Endpoint">' + _('Endpoint').t() + '\
                            </option>\
                            <option value="Identity">' + _('Identity').t() + '\
                            </option>\
                            <option value="Network">' + _('Network').t() + '\
                            </option>\
                            <option value="Operations">' + _('Operations').t() + '\
                            </option>\
                            <option value="Other">' + _('Other').t() + '\
                            </option>\
                            <option value="Threat">' + _('Threat').t() + '\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#killchain" class="">' + _('Kill Chain Phase').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <select data-field="killchain" id="BrutusinForms#killchain"\
                            class="   " title="" >\
                            <option value=""></option>\
                            <option value="Reconnaissance">' + _('Reconnaissance').t() + '\
                            </option>\
                            <option value="Weaponization">' + _('Weaponization').t() + '\
                            </option>\
                            <option value="Delivery">' + _('Delivery').t() + '\
                            </option>\
                            <option value="Exploitation">' + _('Exploitation').t() + '\
                            </option>\
                            <option value="Installation">' + _('Installation').t() + '\
                            </option>\
                            <option value="Command and Control">' + _('Command & Control').t() + '\
                            </option>\
                            <option value="Actions on Objective">' + _('Actions on Objective').t() + '\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2"><a href="https://en.wikipedia.org/wiki/Kill_chain" class="ext external external-link drilldown">' + _('Wikipedia Reference').t() + '</a></td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_0" class="">' + _('SPL Ease').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value" data-children-count="2">\
                        <select data-field="SPLEase" id="BrutusinForms#0_0"\
                            class="   " title="" >\
                            <option value=""></option>\
                            <option value="Advanced">' + _('Advanced').t() + '\
                            </option>\
                            <option value="Basic">' + _('Basic').t() + '\
                            </option>\
                            <option value="Hard">' + _('Hard').t() + '\
                            </option>\
                            <option value="Medium">' + _('Medium').t() + '\
                            </option>\
                            <option value="None">' + _('None').t() + '\
                            </option>\
                        </select>\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('How easy is this SPL to understand (for those looking at SSE just as a learning tool).').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label class="">' + _('MITRE ATT&CK and PRE-ATT&CK').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                    </td>\
                </tr>\
                <tr><td colspan="2"><div id="mitre_container"></div></td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_21" class="">' + _('Search Keywords').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="searchkeywords" type="text" id="BrutusinForms#0_21" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The in-browser search keywords automatically indexes the description, title, category, use case, how to respond, how to implement, known false positives, and help. But if you want to add some highly-weighted custom words (e.g., "AWS cloudtrail amazon web services") then you can add them here, space separated.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#advanced" class="">' + _('Advanced Tags').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="advancedtags" type="text" id="BrutusinForms#advanced" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('You can optionally add advanced tags here, which will show up in the Advanced filter. For multiple tags, separate with pipes (e.g., "Development|Cool Search|Mary")').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_18" class="">' + _('Printable Image URL').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="printable_image" type="text" id="BrutusinForms#0_18" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Optional field: When creating a PDF export, we will include a screenshot showing the demo results.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_11" class="">' + _('Icon').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input type="text" data-field="icon" id="BrutusinForms#0_11" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The icon that shows up on the main Security Content page (or wherever the tile exists).').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label class="">' + _('Company Logo').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                    <label for="BrutusinForms#company_logo">URL</label>\
                    <input type="text" data-field="company_logo" id="BrutusinForms#company_logo" class=" ">\
                    <label for="BrutusinForms#company_logo_width">Width (Pixels)</label>\
                    <input type="text" data-field="company_logo_width" id="BrutusinForms#company_logo_width" class=" ">\
                    <label for="BrutusinForms#company_logo_height">Height (Pixels)</label>\
                    <input type="text" data-field="company_logo_height" id="BrutusinForms#company_logo_height" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('If you would like to present a logo for your organization when a user views this content, provide the URL and dimensions here. The height may not be more than 250 px, and the width may not be more than 500 pixels. For a good user experience, it is recommended not going more than 400x150px.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#company_name" class="">' + _('Company Name').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input type="text" data-field="company_name" id="BrutusinForms#company_name" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('If you would like to present the name for your organization when a user views this content, insert the name here.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#company_description" class="">' + _('Company Description').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="company_description" id="BrutusinForms#company_description" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('If you would like to present a description of your company when a user views this content, insert it here.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#company_link" class="">' + _('Company Link').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input type="text" data-field="company_link" id="BrutusinForms#company_link" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('If you would like a "Learn More" link to appear after the description when a user views this content, provide the URL here.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_3" class="">' + _('Dashboard').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <input data-field="dashboard" type="text" id="BrutusinForms#0_3" class=" ">\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('If you want to have users go to a dashboard when they click on the name, provide that dashboard name here.').t() + '</td></tr>\
                </tbody></table>\
                <table class="dvexpand table table-chrome"><thead><tr><th colspan="2" class="expands">\
                <h2 style="line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;"><a href="#" class="dropdowntext" style="color: black;" onclick=\'$("#customContentDescriptive").toggle(); if($("#customContentDescriptive_arrow").attr("class")=="icon-chevron-right"){$("#customContentDescriptive_arrow").attr("class","icon-chevron-down"); $("#customContentDescriptive_table").addClass("expanded"); $("#customContentDescriptive_table").removeClass("table-chrome");  $("#customContentDescriptive_table").find("th").css("border-top","1px solid darkgray");  }else{$("#customContentDescriptive_arrow").attr("class","icon-chevron-right");  $("#customContentDescriptive_table").removeClass("expanded");  $("#customContentDescriptive_table").addClass("table-chrome"); } return false;\'>&nbsp;&nbsp;<i id="customContentDescriptive_arrow" class="icon-chevron-right"></i>\
                Descriptive Fields</a></h2></th></tr></thead><tbody style="display: none" id="customContentDescriptive">\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_20" class="">' + _('Security Impact').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="relevance" type="text" id="BrutusinForms#0_20" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('(Recommended) Text describing in lamens terms why this content is important.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_8" class="">' + _('Help').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="help" id="BrutusinForms#0_8" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('The value for the help field (less prominently displayed, generally less important)').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_10" class="">' + _('How to Implement').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="howToImplement" id="BrutusinForms#0_10" class=" " />\
                    </td>\
                </tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_14" class="">' + _('Known False Positives').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="knownFP" id="BrutusinForms#0_14" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Optional text describing the known false positives that will be created for this search.').t() + '</td></tr>\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#0_17" class="">' + _('How to Respond').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="operationalize" type="text" id="BrutusinForms#0_17" class=" " />\
                    </td>\
                </tr>\
                <tr><td colspan="2">' + _('Optional text describing the how to respond when this search fires.').t() + '</td></tr>\</tbody></table>\
                <table class="dvexpand table table-chrome"><thead><tr><th colspan="2" class="expands">\
                <h2 style="line-height: 1.5em; font-size: 1.2em; margin-top: 0; margin-bottom: 0;"><a href="#" class="dropdowntext" style="color: black;" onclick=\'$("#customContentSearch").toggle(); if($("#customContentSearch_arrow").attr("class")=="icon-chevron-right"){$("#customContentSearch_arrow").attr("class","icon-chevron-down"); $("#customContentSearch_table").addClass("expanded"); $("#customContentSearch_table").removeClass("table-chrome");  $("#customContentSearch_table").find("th").css("border-top","1px solid darkgray");  }else{$("#customContentSearch_arrow").attr("class","icon-chevron-right");  $("#customContentSearch_table").removeClass("expanded");  $("#customContentSearch_table").addClass("table-chrome"); } return false;\'>&nbsp;&nbsp;<i id="customContentSearch_arrow" class="icon-chevron-right"></i>\
                Search Fields</a></h2></th></tr></thead><tbody style="display: none" id="customContentSearch">\
                <tr>\
                    <td class="prop-name">\
                        <label for="BrutusinForms#search" class="">' + _('Search').t() + ':\
                            <sup>*\
                            </sup>\
                        </label>\
                    </td>\
                    <td class="prop-value">\
                        <textarea style="width: 100%; height: 200px;" data-field="search" id="BrutusinForms#search" class=" " />\
                    </td>\
                </tr>\
            </tbody>\
        </table>')

        let mitre = SummarizeMitre(mitre_attack, mitre_preattack)
        window.mitre = mitre
        window.active_techniques = [];
        window.active_tactics = [];
        window.mitre_notes = "";
        window.active_datasources = []
        if (summary) {
            // console.log("Running customContentModal on showcase", summary)
            if (summary.mitre_technique) {
                summary.mitre_technique = summary.mitre_technique.replace(/^\|/, "").replace(/\|$/, "")
                window.active_techniques = summary.mitre_technique.split(/\|/)
            }
            if (summary.mitre_tactic) {
                summary.mitre_tactic = summary.mitre_tactic.replace(/^\|/, "").replace(/\|$/, "")
                window.active_tactics = summary.mitre_tactic.split(/\|/)
            }
            if (summary.mitre_notes) {
                window.mitre_notes = summary.mitre_notes
            }
            if (summary.data_source_categories) {
                summary.data_source_categories = summary.data_source_categories.replace(/^\|/, "").replace(/\|$/, "")
                window.active_datasources = summary.data_source_categories.split(/\|/)
                // console.log("Setting data sources to ", window.active_datasources)
            }
            for (field in summary) {
                if (myBody.find("[data-field=" + field + "]").length > 0) {
                    myBody.find("[data-field=" + field + "]").val(summary[field])
                }
            }

        }
        if (potentialExtractions) {
            if (potentialExtractions['alertvolume'] && potentialExtractions['alertvolume'] != "" && potentialExtractions['alertvolume'] != null) {
                let success = false;
                let options = [];
                let select = myBody.find("[data-field=alertvolume]");
                for (let i = 0; i < select.find("option").length; i++) {
                    let option = $(select.find("option")[i]).attr("value")
                    if (option != "") {
                        options.push(option)
                    }
                }
                if (options.indexOf(potentialExtractions['alertvolume']) >= 0) {
                    select.val(potentialExtractions['alertvolume'])
                    success = true;
                }
                if (!success) {
                    myBody.prepend('<div style="background-color: #FFAEAE; border: 1px solid #DF4141; border-radius: 6px;">' + _('Warning, heuristics extracted a potential Alert Volume but couldn\'t match it:').t() + ' ' + potentialExtractions['confidence'] + '</div>')
                }
            }
            if (potentialExtractions['impact'] && potentialExtractions['impact'] != "" && potentialExtractions['impact'] != null) {
                let success = false;
                let options = [];
                let select = myBody.find("[data-field=severity]");
                for (let i = 0; i < select.find("option").length; i++) {
                    let option = $(select.find("option")[i]).attr("value")
                    if (option != "") {
                        options.push(option)
                    }
                }
                if (options.indexOf(potentialExtractions['impact']) >= 0) {
                    select.val(potentialExtractions['impact'])
                    success = true;
                }
                if (!success) {
                    myBody.prepend('<div style="background-color: #FFAEAE; border: 1px solid #DF4141; border-radius: 6px;">' + _('Warning, heuristics extracted a potential severity but couldn\'t match it:').t() + ' ' + potentialExtractions['severity'] + '</div>')
                }
            }
            if (potentialExtractions['technique'] && potentialExtractions['technique'] != "" && potentialExtractions['technique'] != null) {
                let success = false;
                if (mitre.technique_master[potentialExtractions['technique']]) {
                    active_techniques.push(potentialExtractions['technique'])
                    success = true;
                    if (!potentialExtractions['tactic'] || potentialExtractions['tactic'] == "" || potentialExtractions['tactic'] == null) {
                        for (let i = 0; i < mitre.technique_to_tactic[potentialExtractions['technique']].length; i++) {
                            active_tactics.push(mitre.technique_to_tactic[potentialExtractions['technique']][i])
                        }
                    }
                } else {
                    for (let technique in mitre.technique_master) {
                        if (potentialExtractions['technique'] == mitre.technique_master[technique]['name']) {
                            active_techniques.push(technique)
                            success = true;
                            if (!potentialExtractions['tactic'] || potentialExtractions['tactic'] == "" || potentialExtractions['tactic'] == null) {
                                for (let i = 0; i < mitre.technique_to_tactic[technique].length; i++) {
                                    active_tactics.push(mitre.technique_to_tactic[technique][i])
                                }
                            }
                        }
                    }
                }
                if (!success) {
                    myBody.prepend('<div style="background-color: #FFAEAE; border: 1px solid #DF4141; border-radius: 6px;">' + _('Warning, heuristics extracted a potential technique but couldn\'t match it:').t() + ' ' + potentialExtractions['technique'] + '</div>')
                }
            }
            if (potentialExtractions['tactic'] && potentialExtractions['tactic'] != "" && potentialExtractions['tactic'] != null) {
                let success = false;
                if (mitre.allTactics[potentialExtractions['tactic']]) {
                    active_tactics.push(potentialExtractions['tactic'])
                    success = true;
                } else {
                    for (let tactic in mitre.allTactics) {
                        if (potentialExtractions['tactic'] == mitre.allTactics[tactic]['name']) {
                            active_tactics.push(tactic)
                            success = true;
                        }
                    }
                }
                if (!success) {
                    myBody.prepend('<div style="background-color: #FFAEAE; border: 1px solid #DF4141; border-radius: 6px;">' + _('Warning, heuristics extracted a potential tactic but couldn\'t match it:').t() + ' ' + potentialExtractions['tactic'] + '</div>')
                }
            }
        }

        function launchNotesWindow(target) {
            let showcaseId = target.closest(".showcase").attr("id");
            let existingNotes = window.mitre_notes

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
                    .append($("<p>").text(_("Insert Notes Below, and click Save to record those notes for the future.").t()), $('<textarea showcaseid="' + showcaseId + '" id="method_notes" style="width: 100%; height: 300px;"></textarea>').text(existingNotes));

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
                    window.mitre_notes = $("#method_notes").val();
                    //ShowcaseInfo['summaries'][showcaseId]['mitre_notes'] = notes;
                    $(".methodology-notes").text(window.mitre_notes)
                }))
                myModal.show(); // Launch it!

            })
        }

        function GenerateListOfMITRETechniques(tactic, tacticId) {

            let container = $("<div>")
            container.append("<h3 class=\"add_description\">" + _('Select Technique To Add').t() + "</h3>")

            let techniquelist = Object.keys(tactic.techniques)
            for (let techniquenum = 0; techniquenum < techniquelist.length; techniquenum++) {
                let extraClass = ""
                if (window.active_techniques.indexOf(techniquelist[techniquenum]) >= 0) {
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
                        // let showcaseId = target.closest(".showcase").attr("id")
                    let container = target.closest(".modal-body")
                    if (target.attr("class").indexOf("active") >= 0) {
                        // console.log("Removing", techniqueId, window.active_techniques)
                        target.removeClass("active")
                        var numRemaining = container.find(".mitreTechnique.active").length;
                        window.active_techniques.splice(window.active_techniques.indexOf(techniqueId), 1)


                        if (numRemaining == 0) {
                            container.find(".mitreTactic[tactic=" + tacticId + "]").removeClass("active")

                            if (container.find(".mitreTactic.active").length == 0) {
                                container.removeClass("completed")
                            }

                        }
                        // console.log(numRemaining, "remaining")
                    } else {
                        window.active_techniques.push(techniqueId)
                        container.addClass("completed")
                        // console.log("Adding", techniqueId, window.active_techniques)
                        target.addClass("active")
                        container.find(".mitreTactic[tactic=" + tacticId + "]").addClass("active")

                    }

                }))

            }
            return container
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
        let mitre_parent = $("<div class=\"customize-mitre\">")
        let mitre_techniques = $("<div class=\"technique_container\">")

        let notesIfPresent = $("<div class=\"methodology-notes\">")
        mitre_parent.append($("<p>Methodology Notes </p>").append($('<i class="icon-pencil"/>').click(function(evt) { launchNotesWindow($(evt.target)) })), notesIfPresent, $("<p>" + _('PRE-ATT&CK').t() + ":</p>"))
        let sorted_tactics = Object.keys(mitre.pre_attack).sort()
        for (let counter = 0; counter < sorted_tactics.length; counter++) {
            let tactic = sorted_tactics[counter]
            let extraClass = ""
            if (window.active_tactics.indexOf(tactic) >= 0) {
                extraClass += " active"
            }
            mitre_parent.append($("<button class=\"mitreTactic " + extraClass + "\" tactic=\"" + tactic + "\">").text(mitre.pre_attack[tactic].name).click(function(evt) {
                let target = $(evt.target);
                let tacticId = target.attr("tactic")
                    //let showcaseId = target.closest(".showcase").attr("id")
                let container = target.closest(".customize-mitre")

                container.find(".technique_container").html("")
                    //container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.pre_attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique))
                container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.pre_attack[tacticId], tacticId))


            }))
        }
        mitre_parent.append($("<p>" + _('ATT&CK').t() + ":</p>"))

        sorted_tactics = Object.keys(mitre.attack).sort()
        for (let counter = 0; counter < sorted_tactics.length; counter++) {
            let tactic = sorted_tactics[counter]
            let extraClass = ""
            if (window.active_tactics.indexOf(tactic) >= 0) {
                extraClass += " active"
            }
            mitre_parent.append($("<button class=\"mitreTactic " + extraClass + "\" tactic=\"" + tactic + "\">").text(mitre.attack[tactic].name).click(function(evt) {
                let target = $(evt.target);
                let tacticId = target.attr("tactic")
                let showcaseId = target.closest(".showcase").attr("id")
                let container = target.closest(".customize-mitre")
                container.find(".technique_container").html("")
                    //container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique))
                container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.attack[tacticId], tacticId))

            }))
        }
        mitre_parent.append(mitre_techniques)
        myBody.find("#mitre_container").append(mitre_parent)



        let ds_parent = $("<div class=\"customize-datasources\">")
        datasources = Object.keys(data_inventory).sort()
        for (let counter = 0; counter < datasources.length; counter++) {
            let ds = datasources[counter]
            let extraClass = ""
            if (_.intersection(Object.keys(data_inventory[ds].eventtypes), window.active_datasources).length > 0) {
                extraClass += " active"
            }

            ds_parent.append($("<button class=\"dataSourceSelection " + extraClass + "\" data-ds=\"" + ds + "\">").attr("title", data_inventory[ds].description).text(data_inventory[ds].name).click(function(evt) {
                let target = $(evt.target);
                let ds = target.attr("data-ds")
                let container = target.closest(".customize-datasources")
                container.find(".dsc_container").html("")
                    //container.find(".technique_container").append(GenerateListOfMITRETechniques(mitre.attack[tacticId], tacticId, ShowcaseInfo['summaries'][showcaseId].mitre_technique))
                container.find(".dsc_container").append(GenerateListOfDSCs(ds))

            }))
        }

        let dsc = $("<div class=\"dsc_container\">")
        ds_parent.append(dsc);
        myBody.find("#data_source_categories").append(ds_parent)


        function GenerateListOfDSCs(ds) {

            let container = $("<div>")
            container.append("<p class=\"add_dsc\">" + _('Select Data Source Category To Add').t() + "</p>")

            let dscList = Object.keys(data_inventory[ds].eventtypes)
            for (let i = 0; i < dscList.length; i++) {
                let extraClass = ""
                if (window.active_datasources.indexOf(dscList[i]) >= 0) {
                    extraClass += " active"
                }
                // console.log("Looking for", dscList[i], "in", window.active_datasources, "with result", extraClass)
                name = data_inventory[ds].eventtypes[dscList[i]].name

                container.append($("<button class=\"dscSelection " + extraClass + "\" data-ds=\"" + ds + "\" data-dsc=\"" + dscList[i] + "\">").attr("title", data_inventory[ds].eventtypes[dscList[i]].description).text(name).click(function(evt) {
                    let target = $(evt.target);
                    let dsId = target.attr("data-ds")
                    let dscId = target.attr("data-dsc")
                        // let showcaseId = target.closest(".showcase").attr("id")
                    let container = target.closest(".modal-body")
                    if (target.attr("class").indexOf("active") >= 0) {
                        // console.log("Removing", dsId, dscId, window.active_datasources)
                        target.removeClass("active")
                        var numRemaining = container.find(".dscSelection.active").length;
                        window.active_datasources.splice(window.active_datasources.indexOf(dscId), 1)

                        if (numRemaining == 0) {
                            container.find(".dataSourceSelection[data-ds=" + ds + "]").removeClass("active")

                            if (container.find(".mitreTactic.active").length == 0) {
                                container.removeClass("completed")
                            }

                        }
                        // console.log(numRemaining, "remaining")
                    } else {

                        window.active_datasources.push(dscId)
                        container.addClass("completed")
                        // console.log("Adding", dsId, dscId, window.active_datasources)
                        target.addClass("active")
                        container.find(".dataSourceSelection[data-ds=" + dsId + "]").addClass("active")

                    }

                }))

            }
            return container
        }




        myBody.find(".prop-name, .prop-value").css("border-top", "1px solid gray").css("margin-top", "20px").css("padding-top", "10px")
        $(newCustomModal.$el).addClass("modal-extra-wide").on("hide", function() {
            // Not taking any action on hide, but you can if you want to!
        })

        newCustomModal.body.append(myBody)
        let ButtonTextString = "Add"
        if (summary && summary.id) {
            ButtonTextString = _("Update").t()
        }
        newCustomModal.footer.append($('<button>').addClass('mlts-modal-cancel').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn btn-default mlts-modal-cancel').text('Cancel'), $('<button>').addClass('mlts-modal-submit').attr({
            type: 'button'
        }).addClass('btn btn-primary mlts-modal-submit').attr("id", "saveNewFilters").text(ButtonTextString).on('click', function() {
            let obj = {};
            let fields = $(".modal-body").find("[data-field]");
            let haveAllRequired = true;
            for (let i = 0; i < fields.length; i++) {
                let value = $($(".modal-body").find("[data-field]")[i]).val()
                let field = $($(".modal-body").find("[data-field]")[i]).attr("data-field");
                let container = $($(".modal-body").find("[data-field]")[i]).closest("tr");
                let isRequired = container.find("label").attr("class").indexOf("required") >= 0 ? true : false
                if (isRequired == true && value == "") {
                    haveAllRequired = false;
                    container.find("td").css("background-color", "#FFEEEE");
                    container.addClass("missingValue");
                    // console.log("Missing Text for required field ", field)
                } else if (typeof value != "undefined" && value != "") {
                    // console.log("Got ", field, "with", value);
                    obj[field] = value
                    container.removeClass("missingValue");
                    container.find("td").css("background-color", "#ffffff");
                } else {
                    // console.log("Got empty ", field);
                    obj[field] = ""
                }
            }

            let bookmark_status = "";
            let isBookmarkChanged = true;
            if (obj['bookmark_status'] && obj['bookmark_status'] != "") {
                bookmark_status = obj['bookmark_status'];
                delete obj['bookmark_status'];
            }
            if (summary && summary.id && summary.bookmark_status && summary.bookmark_status == bookmark_status) {
                isBookmarkChanged = false;
            }
            // Handle for data sources
            if (window.active_datasources.length > 0) {
                obj['data_source_categories'] = window.active_datasources.join("|")
                let container = $(".modal-body").find("#data_source_categories").closest("tr");
                container.removeClass("missingValue");
                container.find("td").css("background-color", "#ffffff");
            } else {
                haveAllRequired = false;
                let container = $(".modal-body").find("#data_source_categories").closest("tr");
                container.find("td").css("background-color", "#FFEEEE");
                container.addClass("missingValue");
                // console.log("Missing Text for required field", "data_source_categories")
            }

            if (window.active_techniques.length > 0) {
                obj['mitre_technique'] = window.active_techniques.join("|")
                let selectedTactics = $(".mitreTactic.active")
                let tacticArray = []
                for (let i = 0; i < selectedTactics.length; i++) {
                    tacticArray.push($(selectedTactics[i]).attr("tactic"))
                }
                obj['mitre_tactic'] = tacticArray.join("|")
            }

            if (haveAllRequired) {
                let newShowcaseId = "custom_" + obj['name'].replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                if (summary && summary.id) {
                    newShowcaseId = summary.id
                        // We never change the summary id, 'cause it could screw up bookmarks, etc.
                }
                // console.log("Fin", haveAllRequired, obj);

                // Check to see if there's a match
                let blockingShowcaseId = "";

                let keys = Object.keys(localShowcaseInfo['summaries']);
                for (let i = 0; i < keys.length; i++) {
                    if (summary && summary.id && keys[i] == summary.id) {
                        continue;
                    }
                    if (keys[i] == newShowcaseId || localShowcaseInfo.summaries[keys[i]].name.toLowerCase() == obj.name.toLowerCase()) {
                        blockingShowcaseId = keys[i]
                    }
                }

                if (blockingShowcaseId != "") {

                    require(['jquery',
                        Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/controls/Modal.js")
                    ], function($,
                        Modal) {
                        // Now we initialize the Modal itself
                        var myModal = new Modal("existingDetectionPresent", {
                            title: _("Existing Detection Present").t(),
                            backdrop: 'static',
                            keyboard: false,
                            destroyOnHide: true,
                            type: 'normal'
                        });
                        myModal.body
                            .append($("<p>").text(_("Error! There is already an example with that name -- no two examples can have the same name.").t()));

                        myModal.footer.append($('<button>').attr({
                            type: 'button',
                            'data-dismiss': 'modal'
                        }).addClass('btn btn-primary').text( _('Close').t() ))
                        myModal.show(); // Launch it!

                    })
                } else {

                    let record = {
                        _time: (new Date).getTime() / 1000,
                        _key: newShowcaseId,
                        showcaseId: newShowcaseId,
                        channel: "custom",
                        json: JSON.stringify(obj),
                        user: Splunk.util.getConfigValue("USERNAME")
                    }
                    if (summary && summary.id) {
                        handleNewContentTelemetry("update", obj)
                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/custom_content/' + record['_key'],
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(record),
                            success: function(returneddata) {
                                bustCache()
                                newkey = returneddata;
                                // console.log("Got a response", returneddata);
                                $("#newCustom").modal('hide');
                                var myModal = new Modal("detectionUpdated", {
                                    title: _("Updated").t(),
                                    backdrop: 'static',
                                    keyboard: false,
                                    destroyOnHide: true,
                                    type: 'normal'
                                });
                                $(myModal.$el).on('hide', function() {
                                    successCallback(record['_key'], obj)
                                })
                                myModal.body
                                    .append($("<p>").text("Success!"));

                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn btn-primary').text('Close'))
                                myModal.show(); // Launch it!
                            },
                            error: function(xhr, textStatus, error) {
                                console.error("Error Updating!", xhr, textStatus, error);
                                triggerError(xhr.responseText);
                            }
                        })
                    } else {
                        handleNewContentTelemetry("add", obj)
                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/custom_content',
                            type: 'POST',
                            contentType: "application/json",
                            async: true,
                            data: JSON.stringify(record),
                            success: function(returneddata) {
                                bustCache()
                                newkey = returneddata;
                                // console.log("Got a response", returneddata);
                                $("#newCustom").modal('hide');
                                var myModal = new Modal("detectionAdded", {
                                    title: _("Added").t(),
                                    backdrop: 'static',
                                    keyboard: false,
                                    destroyOnHide: true,
                                    type: 'normal'
                                });
                                $(myModal.$el).on('hide', function() {
                                    successCallback(record['_key'], obj)
                                })
                                myModal.body
                                    .append($("<p>").text(_("Success!").t() ));

                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn btn-primary').text( _('Close').t() ))
                                myModal.show(); // Launch it!
                            },
                            error: function(xhr, textStatus, error) {
                                console.error("Error Updating!", xhr, textStatus, error);
                                triggerError(xhr.responseText);
                            }
                        })
                    }
                    if (isBookmarkChanged) {
                        let record = {
                            _time: (new Date).getTime() / 1000,
                            _key: newShowcaseId,
                            showcase_name: obj['name'],
                            status: bookmark_status,
                            user: Splunk.util.getConfigValue("USERNAME")
                        }

                        $.ajax({
                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/?query={"_key": "' + record['_key'] + '"}',
                            type: 'GET',
                            contentType: "application/json",
                            async: false,
                            success: function(returneddata) {
                                if (returneddata.length == 0) {
                                    $.ajax({
                                        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/bookmark/',
                                        type: 'POST',
                                        contentType: "application/json",
                                        async: false,
                                        data: JSON.stringify(record),
                                        success: function(returneddata) {
                                            bustCache(); newkey = returneddata },
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
                                        success: function(returneddata) { bustCache();
                                            newkey = returneddata },
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

                }





            } else {
                // console.log("Missing Content", haveAllRequired, obj);

                let myModal = $('.modal-body:visible');
                let scrollTo = $("tr.missingValue").first();

                myModal.scrollTop(
                    scrollTo.offset().top - myModal.offset().top + myModal.scrollTop()
                );
                scrollTo.find("[data-field]").focus()
            }
        }))
        newCustomModal.show()

    })
}

