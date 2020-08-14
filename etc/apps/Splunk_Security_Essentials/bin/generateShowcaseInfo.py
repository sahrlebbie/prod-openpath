from __future__ import absolute_import

import sys
from splunk.appserver.mrsparkle.lib.util import make_splunkhome_path
def add_to_sys_path(paths, prepend=False):
    for path in paths:
        if prepend:
            if path in sys.path:
                sys.path.remove(path)
            sys.path.insert(0, path)
        elif not path in sys.path:
            sys.path.append(path)

def add_python_version_specific_paths():
    '''
        Adds extra paths for libraries specific to Python2 or Python3,
        determined at a runtime
    '''
    # We should not rely on core enterprise packages:
    if sys.version_info >= (3, 0):
        add_to_sys_path([make_splunkhome_path(['etc', 'apps', 'Splunk_Security_Essentials', 'lib', 'py3'])], prepend=True)
    else:
        add_to_sys_path([make_splunkhome_path(['etc', 'apps', 'Splunk_Security_Essentials', 'lib', 'py2'])], prepend=True)
    # Common libraries like future
    add_to_sys_path([make_splunkhome_path(['etc', 'apps', 'Splunk_Security_Essentials', 'lib', 'py23'])], prepend=True)
    from six.moves import reload_module
    try:
        if 'future' in sys.modules:
            import future
            reload_module(future)
    except Exception:
        '''noop: future was not loaded yet'''
add_to_sys_path([make_splunkhome_path(['etc', 'apps', 'Splunk_Security_Essentials', 'lib', 'py23', 'splunklib'])], prepend=True)
add_python_version_specific_paths()

import traceback
import os
import json 
import re
import six.moves.urllib.request, six.moves.urllib.parse, six.moves.urllib.error, six.moves.urllib.request, six.moves.urllib.error, six.moves.urllib.parse
import time
import csv


splunk_home = os.getenv('SPLUNK_HOME')
sys.path.append(splunk_home + '/etc/apps/Splunk_Security_Essentials/bin/')
sys.path.append(splunk_home + '/etc/apps/Splunk_Security_Essentials/bin/splunklib/')


from bs4 import BeautifulSoup

import traceback

import splunk.rest as rest


import splunk.entity, splunk.Intersplunk
from splunk.clilib.cli_common import getConfKeyValue, getConfStanza, getConfStanzas
from io import open
from six.moves import range

if sys.platform == "win32":
    import msvcrt
    # Binary mode is required for persistent mode on Windows.
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stderr.fileno(), os.O_BINARY)

from splunk.persistconn.application import PersistentServerConnectionApplication

import splunklib.client as client
from splunklib.client import ConfigurationFile

class ShowcaseInfo(PersistentServerConnectionApplication):
    def __init__(self, command_line, command_arg):
        PersistentServerConnectionApplication.__init__(self)
    def handle(self, in_string):
        input = {}
        payload = {}
        caching = "requireupdate"
        sessionKey = ""
        owner = "" 
        app = "Splunk_Security_Essentials" 
        includeSSEFilter = True
        settings = dict()
        base_url =""
        bookmarks = dict()
        kvstore_usernames = dict()
        kvstore_conversion = dict()
        # kvstore_data_status = dict()
        eventtypes_data_status = dict()
        # eventtypes_coverage_level = dict()
        eventtype_names = {}
        dsc_to_ds_name = {}
        eventtype_to_legacy_names = {}
        myApps = [app]
        globalSourceList = dict()
        debug = []
        globalSearchList = dict()
        mitre_attack_blob = dict()
        mitre_preattack_blob = dict()
        mitre_names = {"attack": {}, "preattack": {}}
        mitre_refs_to_names = {}
        mitre_refs_to_refs = {}
        mitre_techniques_to_groups = {}
        # mitre_techniques_to_group_objs = {}
        # group_ref_technique_ref_to_details = {}
        mitre_group_name_to_description = {}
        mitre_group_name_to_id = {}
        mitre_refs_to_ids = {}
        mitre_technique_descriptions = {}
        mitre_keywords = {}
        desired_locale = ""
        valid_locales = ["ja-JP", "en-DEBUG"]
        custom_content = []
        channel_exclusion = {}
        ignore_channel_exclusion = False
        channel_to_name = {}
        dsc_to_productIds = {}
        dsc_to_da_scores = {}
        product_details = {}
        popularity_threshold = 5
        popularTechniques = {}
        field_list_version = "all"
        summary_id = ""
        mini_fields = ["id", "includeSSE", "examples", "mitre_keywords", "dashboard", "bookmark_status_display", "icon", "name", "description", "usecase", "category", "mitre_technique_display", "mitre_tactic_display", "data_source_categories_display", "channel", "displayapp", "journey", "highlight", "alertvolume", "domain", "mitre_threat_groups", "data_available", "enabled", "killchain", "hasSearch", "SPLEase", "advancedtags", "released", "searchKeywords", "datasource"]
        start_time = time.time()
        search_mappings = {}
        bookmark_display_names = { "none": "Not On List", "bookmarked": "Bookmarked", "inQueue": "Ready for Deployment", "needData": "Waiting on Data", "issuesDeploying": "Deployment Issues", "needsTuning": "Needs Tuning", "successfullyImplemented": "Successfully Implemented" }
        throwErrorMessage = False
        key_checking = {
            "app":   "text",
            "bookmark_notes":   "text",
            "bookmark_status":   "text",
            "bookmark_status_display":   "text",
            "bookmark_user":   "text",
            "datasource":   "text",
            "create_data_inventory": "boolean",
            "datasources":   "text",
            "name":   "text",
            "inSplunk":   "text",
            "journey":   "text",
            "usecase":   "text",
            "highlight":   "text",
            "alertvolume":   "text",
            "severity":   "text",
            "category":   "text",
            "description":   "text",
            "displayapp":   "text",
            "domain":   "text",
            "gdpr":   "text",
            "gdprtext":   "text",
            "hasSearch":   "text",
            "mitre":   "text",
            "released":   "text",
            "killchain":   "text",
            "SPLEase":   "text",
            "searchkeywords":   "text",
            "advancedtags":   "text",
            "printable_image":   "text",
            "icon":   "text",
            "company_logo":   "text",
            "company_logo_width":   "text",
            "company_logo_height":   "text",
            "company_name":   "text",
            "company_description":   "text",
            "company_link":   "text",
            "dashboard":   "text",
            "relevance":   "text",
            "help":   "text",
            "howToImplement":   "text",
            "knownFP":   "text",
            "operationalize":   "text",
            "search":   "spl",
            "data_source_categories":   "text",
            "mitre_technique":   "text",
            "mitre_tactic":   "text",
            "additional_context": "array",
            "additional_context.title": "text",   
            "additional_context.search_label": "text",
            "additional_context.detail": "text",
            "additional_context.link": "text",
            "additional_context.search_lang": "text",
            "additional_context.search": "spl",
            "additional_context.open_panel": "boolean",
            "open_search_panel": "boolean"
        }
        
        debug.append("Stage -5 Time Check:" + str(time.time() - start_time) )
        try: 
            input = json.loads(in_string)
            sessionKey = input['session']['authtoken']
            owner = input['session']['user']
            if "query" in input:
                for pair in input['query']:
                    if pair[0] == "app":
                        app = pair[1]
                    elif pair[0] == "hideExcludedContent":
                        if pair[1] == "false":
                            includeSSEFilter = False
                    elif pair[0] == "ignoreChannelExclusion":
                        if pair[1] == "true":
                            ignore_channel_exclusion = True
                    elif pair[0] == "fields":
                        if pair[1] == "mini":
                            field_list_version = "mini"
                    elif pair[0] == "summaryId":
                        summary_id = pair[1]
                    # elif pair[0] == "caching":
                    #     if pair[1] == "cached":
                    #         caching = "cached"
                    #     if pair[1] == "requireupdate":
                    #         caching = "requireupdate"
                    #     if pair[1] == "updateonly":
                    #         caching = "updateonly"
                    elif pair[0] == "locale":
                        if pair[1] in valid_locales:
                            desired_locale = "." + pair[1]
        except:
            return {'payload': json.dumps({"response": "Error! Couldn't find any initial input. This shouldn't happen."}),  
                    'status': 500          # HTTP status code
            }
        #caching = "cached"

        debug.append("Stage -4 Time Check:" + str(time.time() - start_time) )
        try:
            # Getting configurations
            mgmtHostname, mgmtHostPort = getConfKeyValue('web', 'settings', 'mgmtHostPort').split(":")
            base_url = "https://" + mgmtHostname + ":" + mgmtHostPort
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error getting the base_url configuration!", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage -3 Time Check:" + str(time.time() - start_time) )


        try: 
            service = client.connect(host=mgmtHostname, port=mgmtHostPort, token=sessionKey)
            service.namespace['owner'] = 'nobody'
            service.namespace['app'] = 'Splunk_Security_Essentials'
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error grabbing a service object", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage -4 Time Check:" + str(time.time() - start_time) )

        def clean_content(obj, key_checking, path=""):
            for field in list(obj.keys()):
                try:
                    if path + field not in key_checking:
                        del obj[field]
                        debug.append({"status": "WARN", "msg": "clean_content, deleting field not in key_checking", "path": path, "field": field, "key_checking": key_checking})
                    elif obj[field] == None:
                        del obj[field]
                        debug.append({"status": "WARN", "msg": "clean_content, deleting field set to None", "field": field})
                    elif key_checking[path + field] == "text":
                        obj[field] = BeautifulSoup(obj[field], "lxml").text
                    elif key_checking[path + field] == "boolean":
                        if not isinstance(obj[field], bool):
                            debug.append({"status": "WARN", "msg": "clean_content, deleting field because it's not actually a bool", "path": path, "field": field, "value": obj[field]})
                            del obj[field]
                    elif key_checking[path + field] == "number":
                        obj[field] = BeautifulSoup(obj[field], "lxml").text
                    elif key_checking[path + field] == "object":
                        obj[field] = clean_content(obj[field], key_checking, path + field + ".")
                    elif key_checking[path + field] == "array":
                        debug.append({"status": "INFO", "msg": "clean_content, found an array field", "field": field})
                        for i in list(range(0, len(obj[field]) )):
                            debug.append({"status": "INFO", "msg": "clean_content, looking at an array row", "field": field, "row": obj[field][i], "isInstance": isinstance(row, object)})
                            if isinstance(obj[field][i], object):
                                obj[field][i] = clean_content(obj[field][i], key_checking, path + field + ".")
                                debug.append({"status": "INFO", "msg": "clean_content, got my final row", "field": field, "row": obj[field][i], "isInstance": isinstance(row, object)})
                        # obj[field] = clean_content(obj[field], key_checking, path + field + ".")
                    elif key_checking[path + field] == "spl":
                        nochecking = True
                        # We handle this in javascript by doing $("<pre>").text(summary.search) -- jquery strips out invalid characters.
                except Exception as e:
                    del obj[field]
                    debug.append({"status": "ERROR", "msg": "clean_content, error'd while trying to clean content", "error": str(e), "path": path, "field": field, "key_checking": key_checking})

            # debug.append({"status": "INFO", "msg": "clean_content, final obj", "obj": obj})
            return obj
        def isSPLDangerous(spl):
            try: 
                total_url = "/services/search/jobs"
                request = six.moves.urllib.request.Request(total_url,
                    headers = { 'Authorization': ('Splunk %s' % sessionKey)})
                search_results = six.moves.urllib.request.urlopen(request)
            except:
                return true

        def getKVStoreById(store, id):
            
            try:
                # service = client.connect(token=sessionKey)
                # service.namespace['owner'] = 'nobody'
                # service.namespace['app'] = 'Splunk_Security_Essentials'
                kvstore_output = service.kvstore[store].data.query_by_id(id)
                debug.append({"message": "I got a kvstorebyid request", "store": store, "id": id, "returningkey": kvstore_output["_key"]})
            except Exception as e:
                #request = urllib2.Request(base_url + '/servicesNS/nobody/' + app + '/storage/collections/data/sse_json_doc_storage/?query={"_key":"' + "sseshowcase" + desired_locale + '"}',
                total_url = base_url + '/servicesNS/nobody/' + app + "/storage/collections/data/" + store + "/" + id
                debug.append({"status": "Failed to do primary method, reverting to old", "url": total_url, "error": str(e)})
                request = six.moves.urllib.request.Request(total_url,
                    headers = { 'Authorization': ('Splunk %s' % sessionKey)})
                search_results = six.moves.urllib.request.urlopen(request)

                kvstore_output = json.loads(search_results.read())
                debug.append({"message": "I got a kvstorebyid request", "store": store, "id": id, "returningkey": kvstore_output["_key"]})
            
            return kvstore_output

        def getKVStore(store):
            debug.append({"message": "I got a kvstore request", "store": store})
            try:
                # service = client.connect(token=sessionKey)
                # service.namespace['owner'] = 'nobody'
                # service.namespace['app'] = 'Splunk_Security_Essentials'
                kvstore_output = service.kvstore[store].data.query()
            except Exception as e:
                total_url = base_url + '/servicesNS/nobody/' + app + "/storage/collections/data/" + store
                debug.append({"status": "Failed to do primary method, reverting to old", "url": total_url, "traceback": traceback.format_exc(), "error": str(e)})
                request = six.moves.urllib.request.Request(total_url,
                    headers = { 'Authorization': ('Splunk %s' % sessionKey)})
                search_results = six.moves.urllib.request.urlopen(request)

                kvstore_output = json.loads(search_results.read())
            return kvstore_output
        debug.append({"localecheck": desired_locale})
        # if caching == "cached":
        #     total_url = ""
        #     try:
        #         # Now to grab kvstore collection data
        #         kvstore_output = getKVStoreById("sse_json_doc_storage", "sseshowcase" + desired_locale)

        #         debug.append("We're using a kvstore cache for this page load")
        #         # debug.append(kvstore_output)
        #         if kvstore_output:
        #             globalSourceList = json.loads(kvstore_output['json'])
        #             debug.append("I found a kvstore cache for the showcase")
        #             #debug.append(kvstore_output['json'])

        #             try:
        #                 debug.append("Time to render:" + str(time.time() - start_time) )
        #             except:
        #                 debug.append("Couldn't add the time taken")

                    
        #             globalSourceList['debug'] = debug
        #             globalSourceList['throwError'] = throwErrorMessage
        #             return {'payload': globalSourceList,  
        #                     'status': 200          # HTTP status code
        #             }

        #     except Exception as e:
        #         debug.append(json.dumps({"status": "ERROR", "description": "Failed to grab cached sseshowcase", "backup_url": total_url, "desired_locale": desired_locale, "message": str(e), "traceback": traceback.format_exc()}))
        #         throwErrorMessage = False
        # else:
        #     debug.append("Not going cached! Prepare for a long ride.")


        debug.append("Stage -1 Time Check:" + str(time.time() - start_time) )
        try: 
            conf_Stanzas = getConfStanzas("essentials_updates")
            debug.append({"msg": "Channels Configuration Stanzas", "output": conf_Stanzas})
            # standardObjects = ["ES", "ESCU", "UBA", "SSE"]
            for cfg in conf_Stanzas:
                # cfg = getConfStanza('essentials_updates', stanza)
                # setting = cfg.get('disabled')
                # channel = cfg.get('channel')
                # debug.append({"msg": "Channels - got config", "cfg": cfg})
                setting = None 
                if "disabled" in conf_Stanzas[cfg]:
                    setting = conf_Stanzas[cfg]["disabled"]
                channel = None 
                if "channel" in conf_Stanzas[cfg]:
                    channel = conf_Stanzas[cfg]['channel']    
                name = channel 
                if "name" in conf_Stanzas[cfg]:
                    name = conf_Stanzas[cfg]['name']    
                # debug.append({"msg": "Channels - got stanza", "stanzaName": cfg, "disabled": setting, "channel": channel})
                if channel is not None and channel != "":    
                    channel_to_name[channel] = name
                    if setting is None or setting == "" or setting == 0 or setting == False or setting == "false" or setting == "FALSE":
                        channel_exclusion[channel] = False
                    else:
                        channel_exclusion[channel] = True
            debug.append({"msg": "Final Channel Exclusion", "channel_exclusion": channel_exclusion, "override": ignore_channel_exclusion})
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error grabbing config objects", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        
        debug.append("Stage 0 Time Check:" + str(time.time() - start_time) )

        try:
            # Getting configurations
            url = base_url + '/services/pullJSON?config=mitreattack'
            request = six.moves.urllib.request.Request(url,
                headers = { 'Authorization': ('Splunk %s' % sessionKey)})
            search_results = six.moves.urllib.request.urlopen(request)

            mitre_attack_blob = json.loads(search_results.read())
            
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing mitre attack", "url": url, "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        debug.append("Stage 1 Time Check:" + str(time.time() - start_time) )

        try:
            # Getting configurations
            url = base_url + '/services/pullJSON?config=mitrepreattack'
            request = six.moves.urllib.request.Request(url,
                headers = { 'Authorization': ('Splunk %s' % sessionKey)})
            search_results = six.moves.urllib.request.urlopen(request)

            mitre_preattack_blob = json.loads(search_results.read())
            
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing mitre preattack", "url": url, "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 2 Time Check:" + str(time.time() - start_time) )
        try:
            # Now to grab kvstore collection data
            kvstore_output = getKVStore("bookmark") #service.kvstore['bookmark'].data.query()
            for i in kvstore_output:
                bookmarks[i['_key']] = i

        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing bookmark kvstore", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        
        debug.append("Stage 3 Time Check:" + str(time.time() - start_time) )
        try:
            kvstore_output = getKVStore("local_search_mappings")# service.kvstore['local_search_mappings'].data.query()
            for i in kvstore_output:
                search_mappings[i['showcaseId']] = i['search_title']

        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing local_search_mappings", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        
        debug.append("Stage 4 Time Check:" + str(time.time() - start_time) )
        # try:
            # kvstore_output = getKVStore("data_source_check") # service.kvstore['data_source_check'].data.query()
            # for i in kvstore_output:
            #     if " - Demo" in i['searchName'] or ( i['showcaseId'] in kvstore_data_status and kvstore_data_status[ i['showcaseId'] ] == "Good" ):
            #         continue
            #     kvstore_data_status[i['showcaseId']] = i['status']

        # except Exception as e:
        #     debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing data_source_check", "message": str(e), "traceback": traceback.format_exc()}))
        #     throwErrorMessage = True
        
        debug.append("Stage 5 Time Check:" + str(time.time() - start_time) )
        
        try:
            kvstore_output = getKVStore("data_inventory_products") # service.kvstore['data_inventory_products'].data.query()
            # debug.append({"msg": "Got my kvstore output", "output": kvstore_output})
            for row in kvstore_output:
                if "eventtypeId" in row and row["eventtypeId"] != "" and row["eventtypeId"] != None:
                    eventtypes = row['eventtypeId'].split("|")
                    # debug.append({"msg": "Product Prep", "product": row['productId'], "dsc_string": row['eventtypeId'], "dsc": eventtypes, "stage": row['stage'], "status": row['status'], "row": row })
                    for eventtype in eventtypes:
                        if eventtype not in dsc_to_productIds:
                            dsc_to_productIds[eventtype] = []
                            dsc_to_da_scores[eventtype] = []
                            
                        dsc_to_productIds[eventtype].append(row['productId'])
                        
                        if row['stage'] == "all-done" or row['stage'] == "all-done" or row['stage'] == "step-review" or row['status'] == "manualnodata":
                            if 'coverage_level' in row and row['coverage_level'] != "" and int(row['coverage_level']) != -1:
                                dsc_to_da_scores[eventtype].append(int(row['coverage_level']))
                                # debug.append({"msg": "ADDED PRODUCT W/ Real Coverage", "product": row['productId'], "dsc": eventtype, "stage": row['stage'], "status": row['status'], "coverage_level": row['coverage_level'], "row": row })
                            else: 
                                dsc_to_da_scores[eventtype].append(100)
                                # debug.append({"msg": "ADDED PRODUCT but made up coverage", "product": row['productId'], "dsc": eventtype, "stage": row['stage'], "status": row['status'], "row": row })
                        # else:
                        #     debug.append({"msg": "DID NOT ADD PRODUCT", "product": row['productId'], "dsc": eventtype, "stage": row['stage'], "status": row['status'], "row": row })
                        product_details[row['productId']] = row
            for eventtype in dsc_to_productIds:
                dsc_to_productIds[eventtype] = "|".join(dsc_to_productIds[eventtype])
            # debug.append({"step": "genningProductIdFinal", "list": dsc_to_productIds})

        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing data_inventory_products", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        
        debug.append("Stage 6 Time Check:" + str(time.time() - start_time) )
        try:
            custom_content_input = getKVStore('custom_content')
            for row in custom_content_input:
                try:
                    row['json'] = json.dumps(clean_content(json.loads(row['json']), key_checking))
                    custom_content.append(row)
                    # debug.append({"msg": "successfully added cleaned custom content", "showcaseId": row['showcaseId'], "obj": row})
                except Exception as e:
                    debug.append({"msg": "Got an error when trying to clean custom content", "obj": row, "error": str(e)})
                # for field in custom_content:
            #     debug.append(i)
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing custom_content", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        
        # debug.append("Stage 7 Time Check:" + str(time.time() - start_time) )
        # try:
        #     kvstore_output = getKVStore('data_inventory_eventtypes')
        #     for i in kvstore_output:
        #         eventtypes_data_status[i['eventtypeId']] = i['status']
        #         if "coverage_level" in i and i["coverage_level"] != "" and i['status'] == "complete":
        #             eventtypes_coverage_level[i['eventtypeId']] = i['coverage_level']
        # except Exception as e:
        #     debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while grabbing data_inventory_eventtypes", "message": str(e), "traceback": traceback.format_exc()}))
        #     throwErrorMessage = True
        
            
        debug.append("Stage 8 Time Check:" + str(time.time() - start_time) )
        try:
            # Now to grab files off the filesystem
            for myApp in myApps:
                path = os.environ['SPLUNK_HOME'] + "/etc/apps/" + myApp + "/appserver/static/components/localization/ShowcaseInfo" + desired_locale + ".json"
                debug.append("desired_locale: " + desired_locale)
                debug.append({"showcaseInfoPath": path})
                if desired_locale != "":
                    if not os.path.exists(path):
                        path = os.environ['SPLUNK_HOME'] + "/etc/apps/" + myApp + "/appserver/static/components/localization/ShowcaseInfo.json"
                debug.append("path: " + path)
                with open(path) as f:
                    data = json.load(f)
                    if "summaries" not in globalSourceList:
                        globalSourceList = data
                        
                    else:
                        for summaryName in data['summaries']:
                            if summaryName not in globalSourceList['summaries']:
                                data['summaries'][summaryName]['channel'] = "Splunk_Security_Essentials"
                                data['summaries'][summaryName]['showcaseId'] = summaryName
                                globalSourceList['summaries'][summaryName] = data['summaries'][summaryName]
                                globalSourceList['roles']['default']['summaries'].append(summaryName)
        except Exception as e:
                debug.append(json.dumps({"status": "ERROR", "description": "Fatal Error grabbing ShowcaseInfo", "message": str(e), "traceback": traceback.format_exc()}))
                throwErrorMessage = True

        debug.append("Stage 9 Time Check:" + str(time.time() - start_time) )
        try: 
            # debug.append("# of summaries: " + str(len(globalSourceList['roles']['default']['summaries'])))
            for content in custom_content:
                showcase = json.loads(content['json'])
                if "create_data_inventory" in showcase: 
                    showcase["data_source_categories"] = "VendorSpecific-" + content['channel']
                showcase['custom_user'] = content['user']
                showcase['custom_time'] = content['_time']
                showcase['includeSSE'] = "Yes"
                if "search" in showcase and showcase["search"] != "" and "hasSearch" not in showcase:
                    showcase['hasSearch'] = "Yes"
                showcase['channel'] = content['channel']
                if content['channel'] in channel_to_name:
                    showcase['displayapp'] = channel_to_name[content['channel']]
                    showcase['app'] = content['channel']
                else:
                    showcase['displayapp'] = content['channel']
                    showcase['app'] = content['channel']
                if 'icon' not in showcase or showcase['icon'] == "":
                    showcase['icon'] = "custom_content.png"
                if 'showcaseId' in content and content['showcaseId'] != "" and 'dashboard' not in showcase or showcase['dashboard'] == "":
                    showcase['dashboard'] = "showcase_custom?showcaseId=" + content['showcaseId']
                globalSourceList['roles']['default']['summaries'].append(content['showcaseId'])
                globalSourceList['summaries'][content['showcaseId']] = showcase
                # debug.append("# of summaries: " + str(len(globalSourceList['roles']['default']['summaries'])))
            # debug.append("# of summaries: " + str(len(globalSourceList['roles']['default']['summaries'])))
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while enriching with custom content", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        
        debug.append("Stage 10 Time Check:" + str(time.time() - start_time) )

        try:
            # Getting configurations
            url = base_url + '/services/pullJSON?config=data_inventory'
            request = six.moves.urllib.request.Request(url,
                headers = { 'Authorization': ('Splunk %s' % sessionKey)})
            search_results = six.moves.urllib.request.urlopen(request)

            data_inventory = json.loads(search_results.read())
            for datasource in data_inventory:
                eventtype_names[datasource] = data_inventory[datasource]['name']
                for eventtype in data_inventory[datasource]['eventtypes']:
                    dsc_to_ds_name[eventtype] = data_inventory[datasource]['name'] 
                    eventtype_names[eventtype] = data_inventory[datasource]['eventtypes'][eventtype]['name']
                    if "legacy_name" in data_inventory[datasource]['eventtypes'][eventtype]:
                        eventtype_to_legacy_names[eventtype] = data_inventory[datasource]['eventtypes'][eventtype]["legacy_name"]
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error grabbing data_inventory.json", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 11 Time Check:" + str(time.time() - start_time) )

        try:
            myAssistants = ["showcase_first_seen_demo", "showcase_standard_deviation", "showcase_simple_search"]
            for assistant in myAssistants:
                with open(os.environ['SPLUNK_HOME'] + "/etc/apps/" + myApps[0] + "/appserver/static/components/data/sampleSearches/" + assistant + ".json") as f:
                    data = json.load(f)
                    globalSearchList.update(data)
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error grabbing showcase JSONs", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 12 Time Check:" + str(time.time() - start_time) )
        try:
            with open(os.environ['SPLUNK_HOME'] + "/etc/apps/" + myApps[0] + "/appserver/static/vendor/mitre/enterprise-attack.json") as f:
                if len(list(mitre_attack_blob.keys())) == 0:
                    mitre_attack_blob = json.load(f)
                    debug.append("Using the file version of the attack blob")
                else:
                    debug.append("Found the rest endpoint version of the attack blob")
                debug.append("Attack count" + str(len(mitre_attack_blob['objects'])))
                for obj in mitre_attack_blob['objects']:
                    if "type" in obj and obj['type'] == "relationship":
                        if "intrusion-set" in obj['source_ref'] and "attack-pattern" in obj['target_ref'] and obj["relationship_type"] == "uses":
                            if obj['target_ref'] not in mitre_refs_to_refs:
                                mitre_refs_to_refs[obj['target_ref']] = []
                            mitre_refs_to_refs[obj['target_ref']].append(obj['source_ref'])
                            # group_ref_technique_ref_to_details[obj['source_ref'] + obj['target_ref']] = {
                            #     "external_references": obj["external_references"],
                            #     "description": obj["description"]
                            # }
                        if "intrusion-set" in obj['target_ref'] and "attack-pattern" in obj['source_ref']:
                            if obj['source_ref'] not in mitre_refs_to_refs:
                                mitre_refs_to_refs[obj['source_ref']] = []
                            mitre_refs_to_refs[obj['source_ref']].append(obj['target_ref'])
                            # group_ref_technique_ref_to_details[obj['target_ref'] + obj['source_ref']] = {
                            #     "external_references": obj["external_references"],
                            #     "description": obj["description"]
                            # }
                    if "type" in obj and obj['type'] == "intrusion-set":
                        mitre_refs_to_names[obj['id']] = obj['name']
                        for reference in obj['external_references']:
                            if "url" in reference and "https://attack.mitre.org/groups/" in reference['url']:
                                mitre_refs_to_ids[obj['id']] = reference['external_id']
                        # if "description" in obj:
                        #     mitre_group_name_to_description[obj['name']] = obj['description']
                        mitre_group_name_to_id[obj['name']] = obj['id']
                    if "external_references" in obj:
                        for reference in obj['external_references']:
                            if "type" in obj and obj["type"] == "attack-pattern" and "url" in reference and "https://attack.mitre.org/techniques/" in reference['url']:
                                mitre_technique_descriptions[reference['external_id']] = obj['description']
                                keywords = list(set(re.findall( r'\[([^\]]*)\]\(', obj['description'])))
                                if keywords:
                                    mitre_keywords[reference['external_id']] = keywords
                            if "url" in reference and "type" in obj and (obj["type"] == "attack-pattern" or obj["type"] == "x-mitre-tactic") and ( "https://attack.mitre.org/techniques/" in reference['url'] or "https://attack.mitre.org/tactics/" in reference['url'] ):
                                mitre_names['attack'][reference['external_id']] = obj['name']
                                mitre_refs_to_names[obj['id']] = reference['external_id']
            with open(os.environ['SPLUNK_HOME'] + "/etc/apps/" + myApps[0] + "/appserver/static/vendor/mitre/pre-attack.json") as f:
                if len(list(mitre_preattack_blob.keys())) == 0:
                    mitre_attack_blob = json.load(f)
                    debug.append("Using the file version of the preattack blob")
                else:
                    mitre_attack_blob = mitre_preattack_blob #lazy
                    debug.append("Found the rest endpoint version of the preattack blob")
                debug.append("Preattack count" + str(len(mitre_attack_blob['objects'])))
                for obj in mitre_attack_blob['objects']:
                    if "type" in obj and obj['type'] == "relationship":
                        if "intrusion-set" in obj['source_ref'] and "attack-pattern" in obj['target_ref']:
                            if obj['target_ref'] not in mitre_refs_to_refs:
                                mitre_refs_to_refs[obj['target_ref']] = []
                            mitre_refs_to_refs[obj['target_ref']].append(obj['source_ref'])
                        if "intrusion-set" in obj['target_ref'] and "attack-pattern" in obj['source_ref']:
                            if obj['source_ref'] not in mitre_refs_to_refs:
                                mitre_refs_to_refs[obj['source_ref']] = []
                            mitre_refs_to_refs[obj['source_ref']].append(obj['target_ref'])
                    if "type" in obj and obj['type'] == "intrusion-set":
                        mitre_refs_to_names[obj['id']] = obj['name']
                    if "external_references" in obj:
                        for reference in obj['external_references']:
                            if "url" in reference and "type" in obj and (obj["type"] == "attack-pattern" or obj["type"] == "x-mitre-tactic") and ( "https://attack.mitre.org/techniques/" in reference['url'] or "https://attack.mitre.org/tactics/" in reference['url'] ):
                                mitre_names['preattack'][reference['external_id']] = obj['name']
                                mitre_refs_to_names[obj['id']] = reference['external_id']   
            for ref in mitre_refs_to_refs:
                for refvalue in mitre_refs_to_refs[ref]:
                    if mitre_refs_to_names[ref] not in popularTechniques:
                        popularTechniques[mitre_refs_to_names[ref]] = 1
                        # debug.append({"item": "mapping", "technique": mitre_refs_to_names[ref], "group": mitre_refs_to_names[refvalue], "count": 1})
                    else:
                        popularTechniques[mitre_refs_to_names[ref]] += 1
                        # debug.append({"item": "mapping", "technique": mitre_refs_to_names[ref], "group": mitre_refs_to_names[refvalue], "count": popularTechniques[mitre_refs_to_names[ref]]})
                    if ref in mitre_refs_to_names and refvalue in mitre_refs_to_names:
                        if mitre_refs_to_names[ref] not in mitre_techniques_to_groups:
                            mitre_techniques_to_groups[mitre_refs_to_names[ref]] = []
                            # mitre_techniques_to_group_objs[mitre_refs_to_names[ref]] = []
                        if mitre_refs_to_names[refvalue] not in mitre_techniques_to_groups[mitre_refs_to_names[ref]]:
                            mitre_techniques_to_groups[mitre_refs_to_names[ref]].append(mitre_refs_to_names[refvalue])
                            # reference = {
                            #     "technique_name": "",#mitre_names['attack'][mitre_refs_to_names[ref]],
                            #     "technique_id": mitre_refs_to_names[ref],
                            #     "group_name": mitre_refs_to_names[refvalue],
                            #     "group_id": mitre_refs_to_ids[refvalue]
                            # }
                            # if mitre_refs_to_names[refvalue] in mitre_group_name_to_description:
                            #     reference["group_description"] = mitre_group_name_to_description[mitre_refs_to_names[refvalue]]
                            # localID = refvalue + ref
                            # if localID in group_ref_technique_ref_to_details:
                            #     reference["external_references"] = group_ref_technique_ref_to_details[localID]['external_references']
                            #     reference["description"] = group_ref_technique_ref_to_details[localID]['description']
                            #     # reference["dvdebug"] = JSON.dumps(mitre_group_name_to_description)
                            # mitre_techniques_to_group_objs[mitre_refs_to_names[ref]].append(reference)
                            
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while handling MITRE Processing", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True


        debug.append("Stage 13 Time Check:" + str(time.time() - start_time) )
        try:
            # Now we clear out any invalid characters in IDs and names
            keys = list(globalSourceList['summaries'].keys())
            debug.append("Debug Starting")
            for summaryName in keys:
                m = re.search("[^a-zA-Z0-9_]", summaryName)
                if m:
                    newSummaryName = re.sub(r"[^a-zA-Z0-9_\-]", "", summaryName)
                    globalSourceList['summaries'][newSummaryName] = globalSourceList['summaries'].pop(summaryName)
                    index = globalSourceList['roles']['default']['summaries'].index(summaryName)
                    globalSourceList['roles']['default']['summaries'][index] = newSummaryName
            
            for summaryName in globalSourceList['summaries']:    
                regex = r"\&[a-zA-Z0-9#]{2,10};"
                m = re.search(regex, globalSourceList['summaries'][summaryName]['name'])
                if m:
                    newName = re.sub(regex, "", globalSourceList['summaries'][summaryName]['name'])
                    globalSourceList['summaries'][summaryName]['name'] = newName
                # elif "Allowed" in globalSourceList['summaries'][summaryName]['name']:
                    # debug.append("NO NAME match " + globalSourceList['summaries'][summaryName]['name'])
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error Clearing!", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 14 Time Check:" + str(time.time() - start_time) )
        try:
            # Now we do enrichment and processing
            for summaryName in globalSourceList['summaries']:
                # Define all the defaults for enrichment
                globalSourceList['summaries'][summaryName]["id"] = summaryName
                globalSourceList['summaries'][summaryName]['enabled'] = "No"
                globalSourceList['summaries'][summaryName]["data_available"] = "Unknown"
                globalSourceList['summaries'][summaryName]["data_available_numeric"] = ""
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error setting the defaults for all enrichment", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 14.5 Time Check:" + str(time.time() - start_time) )
        try:
            # Now we do enrichment and processing
            for summaryName in globalSourceList['summaries']:
                # Define all the defaults for enrichment
                if globalSourceList['summaries'][summaryName]["displayapp"] == "Enterprise Security Content Update":
                    if "searchKeywords" in globalSourceList['summaries'][summaryName]:
                        globalSourceList['summaries'][summaryName]["searchKeywords"] += " ESCU"
                    else:
                        globalSourceList['summaries'][summaryName]["searchKeywords"] = "ESCU"
                elif globalSourceList['summaries'][summaryName]["displayapp"] == "Splunk Security Essentials":
                    if "searchKeywords" in globalSourceList['summaries'][summaryName]:
                        globalSourceList['summaries'][summaryName]["searchKeywords"] += " SSE"
                    else:
                        globalSourceList['summaries'][summaryName]["searchKeywords"] = "SSE"
                elif globalSourceList['summaries'][summaryName]["displayapp"] == "Splunk Enterprise Security":
                    if "searchKeywords" in globalSourceList['summaries'][summaryName]:
                        globalSourceList['summaries'][summaryName]["searchKeywords"] += " ES"
                    else:
                        globalSourceList['summaries'][summaryName]["searchKeywords"] = "ES"
                elif globalSourceList['summaries'][summaryName]["displayapp"] == "Splunk User Behavior Analytics":
                    if "AT" in summaryName:
                        if "advancedtags" in globalSourceList['summaries'][summaryName]:
                            globalSourceList['summaries'][summaryName]["advancedtags"] += "|UBA Anomaly"
                        else: 
                            globalSourceList['summaries'][summaryName]["advancedtags"] = "UBA Anomaly"
                        if "searchKeywords" in globalSourceList['summaries'][summaryName]:
                            globalSourceList['summaries'][summaryName]["searchKeywords"] += " Anomaly"
                        else:
                            globalSourceList['summaries'][summaryName]["searchKeywords"] = "Anomaly"
                    elif "TT" in summaryName:
                        if "advancedtags" in globalSourceList['summaries'][summaryName]:
                            globalSourceList['summaries'][summaryName]["advancedtags"] += "|UBA Threat"
                        else: 
                            globalSourceList['summaries'][summaryName]["advancedtags"] = "UBA Threat"
                        if "searchKeywords" in globalSourceList['summaries'][summaryName]:
                            globalSourceList['summaries'][summaryName]["searchKeywords"] += " Threat"
                        else:
                            globalSourceList['summaries'][summaryName]["searchKeywords"] = "Threat"
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error adding in the UBA Threat and Anomaly", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True


        debug.append("Stage 15 Time Check:" + str(time.time() - start_time) )
        try:
            # Now we do enrichment and processing
            for summaryName in globalSourceList['summaries']:

                # Handle bookmark status
                if summaryName in bookmarks:
                    globalSourceList['summaries'][summaryName]['bookmark_status'] = bookmarks[summaryName]['status']
                    if "user" in bookmarks[summaryName]:
                        globalSourceList['summaries'][summaryName]['bookmark_user'] = bookmarks[summaryName]['user']
                    else: 
                        globalSourceList['summaries'][summaryName]['bookmark_user'] = "none"
                    if "notes" in bookmarks[summaryName]:
                        globalSourceList['summaries'][summaryName]['bookmark_notes'] = bookmarks[summaryName]['notes']
                    else: 
                        globalSourceList['summaries'][summaryName]['bookmark_notes'] = ""
                    if globalSourceList['summaries'][summaryName]['bookmark_status'] in bookmark_display_names:
                        globalSourceList['summaries'][summaryName]['bookmark_status_display'] = bookmark_display_names[globalSourceList['summaries'][summaryName]['bookmark_status']]
                    else:
                        globalSourceList['summaries'][summaryName]['bookmark_status_display'] = globalSourceList['summaries'][summaryName]['bookmark_status']
                
                    if globalSourceList['summaries'][summaryName]['bookmark_status'] == "successfullyImplemented":
                        globalSourceList['summaries'][summaryName]['enabled'] = "Yes"
                else:
                    globalSourceList['summaries'][summaryName]['bookmark_status'] = "none"
                    globalSourceList['summaries'][summaryName]['bookmark_status_display'] = "Not Bookmarked"
                    globalSourceList['summaries'][summaryName]['bookmark_notes'] = ""
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error during bookmark enrichment", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 16 Time Check:" + str(time.time() - start_time) )
        try:
            for summaryName in globalSourceList['summaries']:
                # Enrich examples with the example data
                if "examples" in globalSourceList['summaries'][summaryName] and len(globalSourceList['summaries'][summaryName]['examples']) > 0:
                    for i in range(0, len(globalSourceList['summaries'][summaryName]['examples'])):
                        if globalSourceList['summaries'][summaryName]['examples'][i]['name'] in globalSearchList:
                            globalSourceList['summaries'][summaryName]['examples'][i]['showcase'] = globalSearchList[globalSourceList['summaries'][summaryName]['examples'][i]['name']]

        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error during actual search enrichment", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 17 Time Check:" + str(time.time() - start_time) )
        try:
            for summaryName in globalSourceList['summaries']:
                globalSourceList['summaries'][summaryName]['search_title'] = ""
                # Enrich examples with the example data
                if summaryName in search_mappings:
                    globalSourceList['summaries'][summaryName]['search_title'] = search_mappings[summaryName]
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error during search mapping enrichment", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 18 Time Check:" + str(time.time() - start_time) )
        try:
            for summaryName in globalSourceList['summaries']:           
                globalSourceList['summaries'][summaryName]['productId'] = ""     
                # eventtypes_data_status
                if "data_source_categories" in globalSourceList['summaries'][summaryName]:
                    eventtypes = globalSourceList['summaries'][summaryName]['data_source_categories'].split("|")
                    eventtype_display = []
                    datasources = []
                    productIds = []
                    productNames = []
                    eventtype_data = []
                    da_score = 0
                    da_score_count = 0
                    for eventtype in eventtypes:
                        if eventtype in dsc_to_da_scores:
                            # debug.append({"msg": "Adding..", "summary": summaryName,  "dsc": eventtype, "scores": dsc_to_da_scores[eventtype]})
                            for score in dsc_to_da_scores[eventtype]:
                                da_score += score
                                da_score_count += 1
                        if eventtype in dsc_to_productIds:
                            products = dsc_to_productIds[eventtype].split("|")
                            for product in products:
                                productIds.append(product)
                                if product in product_details:
                                    if product_details[ product ]['productName'] != "":
                                        productNames.append( product_details[ product ]['vendorName'] + " - " + product_details[ product ]['productName'] )
                                    else:
                                        productNames.append( product_details[ product ]['vendorName'])
                        if eventtype in eventtype_names:
                            eventtype_display.append( eventtype_names[eventtype] )
                            if eventtype in eventtype_to_legacy_names:
                                datasources += eventtype_to_legacy_names[eventtype].split("|")
                            else:
                                datasources += dsc_to_ds_name[eventtype].split("|")
                        # if eventtype in eventtypes_coverage_level and eventtypes_coverage_level[eventtype] != "unknown":
                        #     eventtype_data.append(eventtypes_coverage_level[eventtype])
                        # elif eventtype in eventtypes_data_status and eventtypes_data_status[eventtype] != "unknown":
                        #     if isinstance(eventtypes_data_status[eventtype], str) or isinstance(eventtypes_data_status[eventtype], basestring):
                        #         if eventtypes_data_status[eventtype] == "success":
                        #             eventtype_data.append(100)
                        #         else:
                        #             eventtype_data.append(0)
                        #     elif isinstance(eventtypes_data_status[eventtype], int):
                        #         eventtype_data.append(eventtypes_data_status[eventtype])
                    # if len(eventtype_data) > 0:
                        # total = 0
                        # for num in eventtype_data:
                        #     total += num
                    if da_score_count > 0:
                        # debug.append({"msg": "analyzing da_Score", "summary": summaryName, "eventtypes": eventtypes, "total": da_score, "count": da_score_count, "avg": round(da_score / da_score_count)})
                        globalSourceList['summaries'][summaryName]["data_available_numeric"] = round(da_score / da_score_count)
                        if globalSourceList['summaries'][summaryName]["data_available_numeric"] >= 20:
                            globalSourceList['summaries'][summaryName]["data_available"] = "Good"
                        else:
                            globalSourceList['summaries'][summaryName]["data_available"] = "Bad"
                            globalSourceList['summaries'][summaryName]["data_available_numeric"] = 0
                    else:
                        # debug.append({"msg": "analyzing ZERO da_score_count", "summary": summaryName, "eventtypes": eventtypes, "total": da_score, "count": da_score_count})
                        globalSourceList['summaries'][summaryName]["data_available"] = "Bad"
                        globalSourceList['summaries'][summaryName]["data_available_numeric"] = 0
                    # else:
                    #     globalSourceList['summaries'][summaryName]["data_available"] = "Bad"
                    #     globalSourceList['summaries'][summaryName]["data_available_numeric"] = 0
                    globalSourceList['summaries'][summaryName]['data_source_categories_display'] = "|".join( eventtype_display )
                    globalSourceList['summaries'][summaryName]['datasource'] = "|".join( set( datasources ) )
                    globalSourceList['summaries'][summaryName]['productId'] = "|".join( productIds )
                    globalSourceList['summaries'][summaryName]['product'] = "|".join( productNames )
                # globalSourceList['summaries'][summaryName]['data_source_categories'] = globalSourceList['summaries'][summaryName]['data_source_categories']
                # globalSourceList['summaries'][summaryName]['data_source_categories_display'] = globalSourceList['summaries'][summaryName]['data_source_categories_display']
                # Probably this should be disabled...
                # if summaryName in kvstore_data_status:
                #   globalSourceList['summaries'][summaryName]['data_available'] = kvstore_data_status[summaryName]
                

        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error during Data Availability Enrichment", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 19 Time Check:" + str(time.time() - start_time) )
        try:
            
            for summaryName in globalSourceList['summaries']:                

                #Do Mitre Display Name Mapping
                globalSourceList['summaries'][summaryName]["mitre_tactic_display"] = []
                globalSourceList['summaries'][summaryName]["mitre_technique_display"] = []
                globalSourceList['summaries'][summaryName]["mitre_threat_groups"] = []
                globalSourceList['summaries'][summaryName]["mitre_matrix"] = []
                globalSourceList['summaries'][summaryName]["mitre_technique_description"] = []
                globalSourceList['summaries'][summaryName]["mitre_keywords"] = []
                
                # if summaryName == "basic_brute_force":
                #     globalSourceList["summaries"][summaryName]["mitre_data"] = json.dumps(mitre_names["attack"])
                # globalSourceList['summaries'][summaryName]["mitre_technique_group_json"] = {}
                technique_popularity = []
                # debug.append({"debug": "popularity", "list": popularTechniques})
                if "mitre_tactic" in globalSourceList['summaries'][summaryName]:
                    tactics = globalSourceList['summaries'][summaryName]["mitre_tactic"].split("|")
                    for tactic in tactics:
                        if tactic != "":
                            if tactic in mitre_names['attack']:
                                globalSourceList['summaries'][summaryName]["mitre_tactic_display"].append(mitre_names['attack'][tactic])
                                globalSourceList['summaries'][summaryName]["mitre_matrix"].append("Enterprise ATT&CK")
                            elif tactic in mitre_names['preattack']:
                                globalSourceList['summaries'][summaryName]["mitre_tactic_display"].append(mitre_names['preattack'][tactic])
                                globalSourceList['summaries'][summaryName]["mitre_matrix"].append("PRE-ATT&CK")
                            else:
                                globalSourceList['summaries'][summaryName]["mitre_tactic_display"].append(tactic)
                if "mitre_technique" in globalSourceList['summaries'][summaryName]:
                    techniques = globalSourceList['summaries'][summaryName]["mitre_technique"].split("|")
                    for technique in techniques:
                        if technique != "":
                            if technique in popularTechniques:
                                technique_popularity.append(popularTechniques[technique])
                            else:
                                technique_popularity.append(0)
                            if technique in mitre_technique_descriptions:
                                globalSourceList['summaries'][summaryName]["mitre_technique_description"].append( mitre_technique_descriptions[technique] )
                            if technique in mitre_keywords:
                                # globalSourceList['summaries'][summaryName]["mitre_keywords"] = ["hi"]
                                globalSourceList['summaries'][summaryName]["mitre_keywords"] +=  mitre_keywords[technique]
                            if technique in mitre_techniques_to_groups:
                                globalSourceList['summaries'][summaryName]["mitre_threat_groups"] = globalSourceList['summaries'][summaryName]["mitre_threat_groups"] + mitre_techniques_to_groups[technique]
                            # if technique in mitre_techniques_to_group_objs:
                            #     for group in mitre_techniques_to_group_objs[technique]:
                            #         # if group['group_name'] not in globalSourceList['summaries'][summaryName]["mitre_technique_group_json"]:
                            #             # globalSourceList['summaries'][summaryName]["mitre_technique_group_json"][group['group_name']] = []
                            #         if group['technique_id'] in mitre_names["attack"]:
                            #             group["technique_name"] = mitre_names["attack"][ group['technique_id'] ]
                            #         # globalSourceList['summaries'][summaryName]["mitre_technique_group_json"][group['group_name']].append(group)
                            if technique in mitre_names["attack"]:
                                globalSourceList['summaries'][summaryName]["mitre_technique_display"].append(mitre_names['attack'][technique])
                            elif technique in mitre_names["preattack"]:
                                globalSourceList['summaries'][summaryName]["mitre_technique_display"].append(mitre_names['preattack'][technique])
                            else:
                                globalSourceList['summaries'][summaryName]["mitre_technique_display"].append(technique)
                total = 0
                count = 0
                for item in technique_popularity:
                    count += 1
                    total += item
                if count > 0:
                    globalSourceList['summaries'][summaryName]["mitre_techniques_avg_group_popularity"] = str(round(total / count, 2))
                globalSourceList['summaries'][summaryName]["mitre_threat_groups"] = list(set(  globalSourceList['summaries'][summaryName]["mitre_threat_groups"] )) 
                globalSourceList['summaries'][summaryName]["mitre_threat_groups"].sort()
                # globalSourceList['summaries'][summaryName]["mitre_technique_group_json"] = json.dumps(globalSourceList['summaries'][summaryName]["mitre_technique_group_json"])
                globalSourceList['summaries'][summaryName]["mitre_tactic_display"] = "|".join(globalSourceList['summaries'][summaryName]["mitre_tactic_display"])
                globalSourceList['summaries'][summaryName]["mitre_technique_display"] = "|".join(globalSourceList['summaries'][summaryName]["mitre_technique_display"])
                globalSourceList['summaries'][summaryName]["mitre_threat_groups"] = "|".join( globalSourceList['summaries'][summaryName]["mitre_threat_groups"] )
                globalSourceList['summaries'][summaryName]["mitre_technique_description"] = "|".join( globalSourceList['summaries'][summaryName]["mitre_technique_description"] )
                globalSourceList['summaries'][summaryName]["mitre_keywords"] = " | ".join( set(globalSourceList['summaries'][summaryName]["mitre_keywords"]) )
                globalSourceList['summaries'][summaryName]["mitre_matrix"] = "|".join( globalSourceList['summaries'][summaryName]["mitre_matrix"] )
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error during MITRE Enrichment", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
            

        debug.append("Stage 20 Time Check:" + str(time.time() - start_time) )
        try:
            # Now we default anything that needs to be defaulted
            provide_No_Fields = ["hasSearch"]
            provide_NA_Fields = ["data_source_categories", "data_source_categories_display"]
            provide_none_Fields = []
            provide_Other_Fields = ["category"]
            provide_Empty_String_Fields = ["mitre_techniques_avg_group_popularity"]
            provide_zero_String_Fields = []
            ensure_no_null_fields = ["custom_time", "custom_user"]
            provide_Uppercasenone_Fields = ["killchain", "mitre", "mitre_tactic", "mitre_technique",  "mitre_tactic_display", "mitre_technique_display", "category", "SPLEase"]

            for summaryName in globalSourceList['summaries']:
                if "channel" not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName]['channel'] == "":
                    if "app" in globalSourceList['summaries'][summaryName]:
                        globalSourceList['summaries'][summaryName]['channel'] = globalSourceList['summaries'][summaryName]['app']
                    else:
                        globalSourceList['summaries'][summaryName]['channel'] = "Unknown"

                for field in provide_NA_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == "") and field in provide_NA_Fields:
                        globalSourceList['summaries'][summaryName][field] = "N/A"

                for field in provide_No_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == "") and field in provide_No_Fields:
                        globalSourceList['summaries'][summaryName][field] = "No"

                for field in provide_Empty_String_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == "") and field in provide_Empty_String_Fields:
                        globalSourceList['summaries'][summaryName][field] = ""

                for field in provide_zero_String_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == ""):
                        globalSourceList['summaries'][summaryName][field] = 0

                for field in provide_none_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == "") and field in provide_none_Fields:
                        globalSourceList['summaries'][summaryName][field] = "none"

                for field in provide_Other_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == "") and field in provide_Other_Fields:
                        globalSourceList['summaries'][summaryName][field] = "Other"

                for field in provide_Uppercasenone_Fields:
                    if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] is None or globalSourceList['summaries'][summaryName][field] == "") and field in provide_Uppercasenone_Fields:
                        globalSourceList['summaries'][summaryName][field] = "None"

                # for field in ensure_no_null_fields:
                #     if (field not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName][field] == "") and field in ensure_no_null_fields:
                #         globalSourceList['summaries'][summaryName][field] = ""


        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error while defaulting", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 21 Time Check:" + str(time.time() - start_time) )
        try:
            # Clear out excluded content
            keys = list(globalSourceList['summaries'].keys())
            for summaryName in keys:
                if "includeSSE" not in globalSourceList['summaries'][summaryName] or globalSourceList['summaries'][summaryName]["includeSSE"].lower() != "yes":
                    globalSourceList['summaries'].pop(summaryName)
                elif ignore_channel_exclusion == False and "channel" in globalSourceList['summaries'][summaryName] and globalSourceList['summaries'][summaryName]['channel'] in channel_exclusion and channel_exclusion[ globalSourceList['summaries'][summaryName]['channel'] ]:
                    globalSourceList['summaries'].pop(summaryName)
                    # if summaryName in globalSourceList['roles']['default']['summaries']:
                    #     globalSourceList['roles']['default']['summaries'].remove(summaryName)
            globalSourceList['roles']['default']['summaries'] = list(globalSourceList['summaries'].keys())
            # Now ignoring the roles default summaries in the actual json -- everything is driven by includeSSE
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error pulling excluded content", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True
        globalSourceList['debug'] = debug
        globalSourceList['throwError'] = throwErrorMessage

        debug.append("Stage 22 Time Check:" + str(time.time() - start_time) )


        try:
            fields = ["search_title", "mitre_technique_combined", "mitre_tactic_combined", "killchain", "name", "category"]
            kvstore_output = getKVStore("sse_content_exported")
            collection = service.kvstore['sse_content_exported']
            for summaryName in globalSourceList['summaries']:
                if "search_title" in globalSourceList['summaries'][summaryName] and globalSourceList['summaries'][summaryName]["search_title"] != "":
                    record = {
                        "_key": summaryName,
                        "summaryId": summaryName
                    }
                    for field in fields:
                        if field == "mitre_technique_combined":
                            mitres = globalSourceList['summaries'][summaryName]["mitre_technique"].split("|")
                            record["mitre_technique"] = []
                            record["mitre_technique_combined"] = []
                            record["mitre_technique_description"] = []
                            for mitre in mitres:
                                if mitre != "":
                                    record["mitre_technique"].append(mitre)
                                if mitre in mitre_names['attack']:
                                    record["mitre_technique_combined"].append(mitre + " - " + mitre_names['attack'][mitre])    
                                elif mitre in mitre_names['preattack']:
                                    record["mitre_technique_combined"].append(mitre + " - " + mitre_names['preattack'][mitre])    
                                if mitre in mitre_technique_descriptions:
                                    record["mitre_technique_description"].append( mitre_technique_descriptions[mitre] )
                        elif field == "mitre_tactic_combined":
                            mitres = globalSourceList['summaries'][summaryName]["mitre_tactic"].split("|")
                            record["mitre_tactic"] = []
                            record["mitre_tactic_combined"] = []
                            for mitre in mitres:
                                if mitre != "":
                                    record["mitre_tactic"].append(mitre)
                                if mitre in mitre_names['attack']:
                                    record["mitre_tactic_combined"].append(mitre + " - " + mitre_names['attack'][mitre])    
                                elif mitre in mitre_names['preattack']:
                                    record["mitre_tactic_combined"].append(mitre + " - " + mitre_names['preattack'][mitre])    
                        elif field == "name":
                            record["summaryName"] = globalSourceList['summaries'][summaryName][field]
                        elif field in globalSourceList['summaries'][summaryName]:
                            record[field] = globalSourceList['summaries'][summaryName][field]
                    should = "insert"
                    for row in kvstore_output:
                        if row['_key'] == record['_key']:
                            should = "update"
                            if '_user' in row:
                                del row['_user']
                            if json.dumps(row, sort_keys=True) == json.dumps(record, sort_keys=True):
                                should = "pass"
                            # debug.append({"msg": "Checking exported", "showcase": summaryName, "timecheck": str(time.time() - start_time), "should": should, "row": json.dumps(row, sort_keys=True), "record": json.dumps(record, sort_keys=True)})
                    
                    try:
                        if should == "update":
                            collection.data.update(summaryName, json.dumps(record))
                        elif should == "insert":
                            collection.data.insert(json.dumps(record))
                    except Exception as e:
                        debug.append(json.dumps({"status": "ERROR", "description": "Couldn't add content into the kvstore built for ES Integration.", "insert_message": str(e), "update_message": str(update_e)}))
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Couldn't handle the kvstore built for ES Integration.", "message": str(e), "traceback": traceback.format_exc()}))
            throwErrorMessage = True

        debug.append("Stage 23 Time Check:" + str(time.time() - start_time) )


        # debug.append({"msg": "Here's the dsc_to_scores", "values": dsc_to_da_scores})


        # try:
        #     cacheShowcase = {}
        #    summaryName][field] = globalSourceList['summaries'][summaryName][field]
        #     collection = service.kvstore['sse_showcaseinfo_cache']
        #     kvstore_output = service.kvstore['sse_showcaseinfo_cache'].data.query()
        #     updateObjects = []
        #     for row in kvstore_output:
        #         if row['id'] not in cacheShowcase:
        #             collection.data.delete(json.dumps({"_key":row['id']}))
        #             updateObjects.append(row['id'])
        #         else:
        #             collection.data.update(row['id'], cacheShowcase[row['id']])
        #             updateObjects.append(row['id'])
        #     for summaryName in cacheShowcase:
        #         if summaryName not in updateObjects:
        #             collection.data.insert(cacheShowcase[summaryName])
        # except Exception as e:
        #     debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while updating sse_showcaseinfo_cache", "message": str(e), "traceback": traceback.format_exc()}))
        #     throwErrorMessage = True





        # ## Disabling Caching because it's not enough of a performance benefit
        # ## (Discovered that time to download was the real problem, not time to gen the showcase)
        # try: 
        #     collection = service.kvstore['sse_json_doc_storage']
        # except Exception as e: 
        #     debug.append(json.dumps({"status": "ERROR", "description": "Couldn't establish the kvstore collection... expect more errors.", "message": str(e), "traceback": traceback.format_exc()}))

        # try:
        #     record = {
        #         "_key": "sseshowcase" + desired_locale,
        #         "description": "Cached version of SSE Showcase",
        #         "version": "Not Applicable",
        #         "json": json.dumps(globalSourceList)
        #     }
            
        #     collection.data.update("sseshowcase" + desired_locale, json.dumps(record))
        #     if caching == "updateonly":
        #         return {'payload': {"update": "successful"},  
        #                 'status': 200          # HTTP status code
        #         }
        # except Exception as initial:
        #     try:
        #         collection.data.insert(json.dumps(record))
        #         if caching == "updateonly":
        #             return {'payload': {"update": "successful"},  
        #                     'status': 200          # HTTP status code
        #             }
        #     except Exception as e:
        #         debug.append(json.dumps({"status": "ERROR", "description": "Error occurred while updating sseshowcase", "message": str(e), "traceback": traceback.format_exc()}))
        #         throwErrorMessage = True
        #         try:
        #             total_url = base_url + '/servicesNS/nobody/' + app + "/storage/collections/data/sse_json_doc_storage/" + "sseshowcase" + desired_locale
        #             debug.append({"status": "Failed to update the kvstore via the python sdk, deleting the cache because we can't be trusted.", "url": total_url})
        #             headers = {
        #             'Authorization': ('Splunk %s' % sessionKey)
        #             }
        #             opener = urllib2.build_opener(urllib2.HTTPHandler)
        #             req = urllib2.Request(total_url, None, headers)
        #             req.get_method = lambda: 'DELETE'  # creates the delete method
        #             url = urllib2.urlopen(req)  # deletes database item
        #         except Exception as e: 
        #             if str(e) != "HTTP Error 404: Not Found":
        #                 debug.append(json.dumps({"status": "ERROR", "description": "Error, we couldn't even delete the kvstore entry! What a sad day.", "message": str(e), "traceback": traceback.format_exc()}))
        #                 throwErrorMessage = True
        #             else:
        #                 debug.append(json.dumps({"status": "WARN", "description": "We weren't the first ones here. No cache existed.", "message": ""}))
        
        debug.append("Stage 24 Time Check:" + str(time.time() - start_time) )

        try:
            if field_list_version == "mini":
                del globalSourceList['escu_stories']
                for summaryName in globalSourceList['summaries']:
                    for key in list(globalSourceList['summaries'][summaryName].keys()):
                        if key not in mini_fields:
                            del globalSourceList['summaries'][summaryName][key]
        except Exception as e:
            debug.append(json.dumps({"status": "ERROR", "description": "Error while minifying", "message": str(e), "traceback": traceback.format_exc()}))

        
        debug.append("Stage 25 Time Check:" + str(time.time() - start_time) )

        return {'payload': globalSourceList,  
                'status': 200          # HTTP status code
        }