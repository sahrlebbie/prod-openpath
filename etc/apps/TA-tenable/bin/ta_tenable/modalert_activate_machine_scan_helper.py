import os
import sys
import json
import datetime
from tzlocal import get_localzone
from ar_action_utility import get_ar_index, validate_ip, handle_error
from ar_action_connect import SCUtil

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def dowork(helper):
    """Activates machine scan on Tenable SC server
    
    Args:
        helper (object): object of ModularAlertBase class
    
    Returns:
        dict: The scan resource for the created scan or the error response from handle_error method
    """
    policy_id = int(helper.get_param("policy_name"))
    name_of_scan = helper.get_param("name_of_scan")
    ip = helper.get_param("ip")
    events = helper.get_events()
    for event in events:
        try:
            scu = SCUtil(event, helper)
        except Exception as e:
            return handle_error(
                helper, 
                "SC", 
                "Failed initializing TenableSC. Make sure you have SC account configured"
                " and you are running the AR action on SC notable event.", 
                str(e)
            )

        # validate ip or if not provided find it in event
        if ip and not validate_ip(ip):
            return handle_error(helper, "SC", "Invalid IP address")
        else:
            ip = event.get("ip")
            if not ip:
                return handle_error(helper, "SC", "Could not find IP address!")

        # try to get repo id from event and if not found get it using ip filter from api
        repository_id = event.get("repository.id")
        if not repository_id:
            filters = [("ip", "=", ip)]
            params = {
                "source": "cumulative",
                "sort_field": "score",
                "sort_direction": "desc",
                "tool": "sumip",
                "type": "vuln",
                "limit": 1000
            }
            try:
                vulns = scu.tsc.analysis.vulns(*filters, **params)
            except Exception as e:
                return handle_error(helper, "SC", "Failed to get repository ID", str(e))

            repository_id = next(vulns, None).get("repository").get("id")
            if not repository_id:
                return handle_error(
                    helper, "SC", "Could not find repository ID with IP: {}".format(ip))

        # launch the scan
        name_of_scan = "Machine scan activated for ip {}".format(ip if not name_of_scan else name_of_scan)
        schedule_start = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
        time_zone = str(get_localzone())
        params = {
            "policy_id": policy_id,
            "host_tracking": True,
            "schedule": {
                "start": "TZID=" + time_zone + ":" + schedule_start,
                "repeatRule": "FREQ=NOW;INTERVAL=1",
                "type": "now"
            },
            "targets": [ip],
            "max_time": 9999999999
        }
        try:
            scan_resource_resp = scu.tsc.scans.create(name_of_scan,
                                                    repository_id, **params)
            return scan_resource_resp
        except Exception as e:
            return handle_error(helper, "SC", "Failed to activate scan", str(e))


def process_event(helper, *args, **kwargs):
    """Write response event in sourcetype
    
    Args:
        helper (object): object of ModularAlertBase class
    
    Returns:
        int: return code
    """
    helper.log_info("Alert action activate_machine_scan started.")
    content = dowork(helper)
    helper.addevent(json.dumps(content),
                    sourcetype="tenable:sc:machinescan:ar")
    ar_index = get_ar_index(helper.session_key)
    helper.writeevents(index=ar_index)
    return 0
