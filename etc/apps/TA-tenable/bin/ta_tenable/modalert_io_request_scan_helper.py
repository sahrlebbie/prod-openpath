import os
import sys
import json
from ar_action_utility import get_ar_index, validate_ip, handle_error
from ar_action_connect import IOUtil

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def dowork(helper):
    """Requests a scan on Tenable IO asset
    
    Args:
        helper (object): object of ModularAlertBase class
    
    Returns:
        dict: either the scan launch response or error response from handle_error method
    """
    events = helper.get_events()
    ip = helper.get_param("ip")
    host_name = helper.get_param("host_name")
    scan_name = helper.get_param("scan_name")
    for event in events:
        try:
            iou = IOUtil(event, helper)
        except Exception as e:
            return handle_error(
                helper, 
                "IO", 
                "Failed initializing TenableIO. Make sure you have IO account configured"
                " and you are running the AR action on IO notable event.", 
                str(e)
            )
        # if ip or host name is not provided try to get target from event
        if not ip and not host_name:
            target = event.get("dest_ip") if event.get(
                "dest_ip") else event.get("dest")
        elif ip:
            if not validate_ip(ip):
                return handle_error(helper, "IO", "Invalid IP address")
            else:
                target = ip
        else:
            target = host_name

        try:
            # get the scan id from scan name
            scans_resource_list = iou.tio.scans.list()
        except Exception as e:
            return handle_error(helper, "IO", "Failed to get fetch scan ID", str(e))
        scan_id = None
        for scan in scans_resource_list:
            # return with error response when multiple scan ids are found for given scan name
            if scan_name == scan.get("name"):
                if not scan_id:
                    scan_id = scan.get("id")
                else:
                    return handle_error(
                        helper, 
                        "IO", 
                        "Multiple scan IDs found for the given scan name: {}"
                        .format(scan_name))
        if not scan_id:
            return handle_error(
                helper, 
                "IO", 
                "No scan ID found for the given scan name: {}".format(scan_name)
            )
        try:
            # launch the scan
            scan_instance_uuid = iou.tio.scans.launch(scan_id,
                                                      targets=[target])
            return {"scan_instance_uuid": scan_instance_uuid}
        except Exception as e:
            return handle_error(helper, "IO", "Failed to launch the scan", str(e))

def process_event(helper, *args, **kwargs):
    """Write response event in sourcetype
    
    Args:
        helper (object): object of ModularAlertBase class
    
    Returns:
        int: return code
    """
    helper.log_info("Alert action get_io_vulnerability_summary started.")
    data = dowork(helper)
    helper.addevent(json.dumps(data), sourcetype="tenable:io:scan:ar")
    ar_index = get_ar_index(helper.session_key)
    helper.writeevents(index=ar_index)
    return 0
