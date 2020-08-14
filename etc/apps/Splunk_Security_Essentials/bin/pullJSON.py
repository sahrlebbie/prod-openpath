
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



import os
import json 
import random
import json, csv, re, os
import six.moves.urllib.request, six.moves.urllib.parse, six.moves.urllib.error, six.moves.urllib.request, six.moves.urllib.error, six.moves.urllib.parse
from io import open


import splunk.entity, splunk.Intersplunk
from splunk.clilib.cli_common import getConfKeyValue, getConfStanza

if sys.platform == "win32":
    import msvcrt
    # Binary mode is required for persistent mode on Windows.
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stderr.fileno(), os.O_BINARY)

from splunk.persistconn.application import PersistentServerConnectionApplication

splunk_home = os.getenv('SPLUNK_HOME')
sys.path.append(splunk_home + '/etc/apps/Splunk_Security_Essentials/bin/')
sys.path.append(splunk_home + '/etc/apps/Splunk_Security_Essentials/bin/splunklib/')

import splunklib.client as client


class pullJSON(PersistentServerConnectionApplication):
    def __init__(self, command_line, command_arg):
        PersistentServerConnectionApplication.__init__(self)

    def handle(self, in_string):
        input = {}
        payload = {}
        app = "Splunk_Security_Essentials"
        valid_config_files = {  
            "usecases": {"file": "/components/localization/usecases"}, 
            "data_inventory": {"file": "/components/localization/data_inventory", "specialcustomcontent": "custom_content"},  
            "htmlpanels": {"file": "/components/localization/htmlpanels"}, 
            "sselabels": {"file": "/components/localization/sselabels"}, 
            "config": {"file": "/components/data/system_config"}, 
            "mitreattack": {"file": "/vendor/mitre/enterprise-attack", "kvstore": "sse_json_doc_storage", "key": "mitreattack"}, 
            "mitrepreattack": {"file": "/vendor/mitre/pre-attack", "kvstore": "sse_json_doc_storage", "key": "mitrepreattack"},
            "intro": {"file": "/components/localization/intro_content"}
        }
        desired_config = ""
        valid_locales = ["ja-JP", "en-DEBUG"]
        desired_locale = ""
        path = ""
        try: 
            input = json.loads(in_string)
            sessionKey = input['session']['authtoken']
            owner = input['session']['user']
            if "query" in input:
                for pair in input['query']:
                    if pair[0] == "app":
                        app = pair[1]
                    elif pair[0] == "config":
                        if pair[1] in valid_config_files:
                            desired_config = pair[1]
                    elif pair[0] == "locale":
                        if pair[1] in valid_locales:
                            desired_locale = "." + pair[1]
        except:
            return {'payload': json.dumps({"response": "Error! Couldn't find any initial input. This shouldn't happen."}),  
                    'status': 500          # HTTP status code
            }

        if desired_config=="":
            return {'payload': json.dumps({"response": "Error! No valid configuration specified. Should be passed with ?config=config (to grab the config object)."}),  
                    'status': 500          # HTTP status code
            }
        
        try:
            # Getting configurations
            mgmtHostname, mgmtHostPort = getConfKeyValue('web', 'settings', 'mgmtHostPort').split(":")
            base_url = "https://" + mgmtHostname + ":" + mgmtHostPort
        except Exception as e:
            # debug.append(json.dumps({"status": "ERROR", "description": "Error getting the base_url configuration!", "message": str(e)}))
            throwErrorMessage = True


        try: 
            service = client.connect(host=mgmtHostname, port=mgmtHostPort, token=sessionKey)
            service.namespace['owner'] = 'nobody'
            service.namespace['app'] = 'Splunk_Security_Essentials'
        except Exception as e:
            # debug.append(json.dumps({"status": "ERROR", "description": "Error grabbing a service object", "message": str(e)}))
            throwErrorMessage = True
       
        
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

        def getKVStoreById(store, id):
            try:
                kvstore_output = service.kvstore[store].data.query_by_id(id)
            except:
                #sseshowcase.ja-JP
                #request = urllib2.Request(base_url + '/servicesNS/nobody/' + app + '/storage/collections/data/sse_json_doc_storage/?query={"_key":"' + "sseshowcase" + desired_locale + '"}',
                total_url = base_url + '/servicesNS/nobody/' + app + "/storage/collections/data/" + store + "/" + id
                request = six.moves.urllib.request.Request(total_url,
                    headers = { 'Authorization': ('Splunk %s' % sessionKey)})
                search_results = six.moves.urllib.request.urlopen(request)

                kvstore_output = json.loads(search_results.read())
            return kvstore_output
        try:
            # If there is a kvstore config, check and see if the data is in the kvstore
            if "kvstore" in valid_config_files[desired_config] and 1 == 1:
                kvstore_output = getKVStoreById( valid_config_files[desired_config]['kvstore'], valid_config_files[desired_config]['key'])
                #kvstore_output = service.kvstore[valid_config_files[desired_config]['kvstore']].data.query()
                data = json.loads(kvstore_output['json'])
                return {'payload': data,  
                        'status': 200
                }
        except Exception as e:
                status = "eh, I guess we will move on..."
                # return {'payload': {"message": "Couldn't grab kvstore successfully", "error": str(e)},  
                #         'status': 200
                # }
        try:
            # Now to grab files off the filesystem
            path = os.environ['SPLUNK_HOME'] + "/etc/apps/" + app + "/appserver/static" + valid_config_files[desired_config]['file'] + desired_locale + ".json"
            if desired_locale != "":
                if not os.path.exists(path):
                    path = os.environ['SPLUNK_HOME'] + "/etc/apps/" + app + "/appserver/static" + valid_config_files[desired_config]['file'] + ".json"
            with open(path) as f:
                data = json.load(f)
                debug = []
                # data['debug'] = debug
                debug.append("Testing")
                debug.append(valid_config_files[desired_config])
                try:
                    if "VendorSpecific" in data and "specialcustomcontent" in valid_config_files[desired_config] and 1 == 1:
                        debug.append("We are in it")
                        newTypes = {}
                        kvstore_output = getKVStore( valid_config_files[desired_config]['specialcustomcontent'])
                        debug.append("Got my output")
                        debug.append(kvstore_output)
                        for row in kvstore_output: 
                            debug.append("In the row")
                            customJSON = json.loads(row['json'])
                            debug.append("Looking at...")
                            debug.append(row)
                            if 'create_data_inventory' in customJSON and customJSON['create_data_inventory']:
                                dscid = "VendorSpecific-" + row['channel']
                                baseSearch = "index=NOTAPPLICABLE TERM(No baseSearch Provided)"
                                legacyName = "Unknown Channel: " + row["channel"]
                                shortUnifiedName = "Unknown Channel: " + row["channel"]
                                description = "No Description Provided"
                                commonProductNames = []
                                if "company_description" in customJSON:
                                    description = customJSON['company_description']
                                if "company_name" in customJSON:
                                    legacyName = customJSON['company_name']
                                    shortUnifiedName = customJSON['company_name']
                                    commonProductNames.append(customJSON['company_name'])
                                if "company_base_spl" in customJSON:
                                    baseSearch = customJSON['company_base_spl']
                                if dscid not in newTypes:
                                    newTypes[dscid] = {
                                        "baseSearch": baseSearch,
                                        "legacy_name": legacyName,
                                        "short_unified_name": shortUnifiedName,
                                        "description": description,
                                        "name": legacyName,
                                        "common_product_names": commonProductNames,
                                        "products": {
                                            "cim": {
                                                "basesearch": "index=placeholder",
                                                "errordescription": "...",
                                                "validation": "earliest=-4h | head 100 | stats count",
                                                "name": "Common Information Model"
                                            }
                                        },
                                        "readyForUse": True
                                    }
                        for dscid in newTypes:
                            data['VendorSpecific']['eventtypes'][dscid] = newTypes[dscid]
                except Exception as e:
                    debug.append({"msg": "Got an error!", "error": str(e)})
            # "VendorSpecific-Crowdstrike": {
            #     "baseSearch": "",
            #     "common_product_names": [],
            #     "legacy_name": "Endpoint Detection and Response",
            #     "short_unified_name": "Crowdstrike Logs",
            #     "description": "Crowdstrike Falcon logs show file modifications, application launches, and other EDR logs.",
            #     "name": "Crowdstrike Logs",
            #     "products": {
            #         "cim": {
            #             "basesearch": "index=placeholder",
            #             "errordescription": "...",
            #             "name": "Common Information Model",
            #             "validation": "earliest=-4h | head 100 | stats count"
            #         }
            #     },
            #     "readyForUse": false
            # }
                return {'payload': data,  
                        'status': 200
                }
        except Exception as e: 
            return {'payload': {"section": "one", "message": str(e), "path": path},  
                    'status': 404
            }

        return {'payload': {"section": "two", "path": path},  
                'status': 404
        }
        
