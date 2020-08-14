
[launch_remediation_scan]
param._cam = <json> Active response parameters.

[tenable_vulnerability_summary]
param.ip = <string> IP.
param._cam = <json> Active response parameters.
param.dns_name = <string> DNS Name.

[activate_machine_scan]
param._cam = <json> Active response parameters.
param.name_of_scan = <string> Name of Scan.
param.ip = <string> IP.
param.policy_name = <list> Policy Name.  It's default value is 1000001.

[io_request_scan]
param._cam = <json> Active response parameters.
param.scan_name = <string> Name of Scan.
param.host_name = <string> Host Name.
param.ip = <string> IP.

[get_io_vulnerability_summary]
param._cam = <json> Active response parameters.
param.host_name = <string> Host Name.
param.ip = <string> IP.