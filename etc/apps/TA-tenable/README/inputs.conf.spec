[tenable_io://<name>]
global_account = 
start_time = The date (UTC in \"YYYY-MM-DDThh:mm:ssZ\" format) from when to start collecting the data. Default value taken will be start of epoch time.
sync_plugins = Sync plugin details via this input?
lowest_severity_to_store = The Lowest Vulnerability severity to store.
fixed_vulnerability = Historical fixed vulnerability via this input?
tags = Parameter tags should be of {\"tag_key1\": [\"tag_value1\", \"tag_value2\"...], \"tag_key2\": ...} OR [(\"key1\": [\"value1\", \"value2\",...]), (\"key2\": ...)] format.
max_event_size = Maximum allowed size of an event

[tenable_securitycenter://<name>]
global_account = 
start_time = The date (UTC in \"YYYY-MM-DDThh:mm:ssZ\" format) from when to start collecting the data. Default value taken will be start of epoch time.
sync_plugins = Sync plugin details via this input?
fixed_vulnerability = Historical fixed vulnerability via this input?
query_name = Enter the query name for Tenable.sc vulnerability filter.
max_event_size = Maximum allowed size of an event
page_size = No of events to be fetched in a one page

[tenable_securitycenter_mobile://<name>]
global_account = 
query_name = Enter the query name for Tenable.sc mobile filter.
max_event_size = Maximum allowed size of an event
page_size = No of events to be fetched in a one page