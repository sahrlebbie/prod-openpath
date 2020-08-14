
# ABOUT THIS APP

* The Technology Add-on for Tenable is used to download data from Tenable.io, do parsing and indexing on it.
* Along with Tenable.io, it is used to collect and index data from Tenable.sc and to parse data from Tenable NNM.
* This is an add-on powered by the Splunk Add-on Builder.
* This Add-on uses Splunk KV store for checkpoint mechanism.

# REQUIREMENTS

* Splunk version 7.0, 7.1, 7.2, 7.3 and 8.0
* Appropriate access key and secret key for collecting data from Tenable.io
* Appropriate credentials or valid certificate for collecting data from Tenable.sc.

# Release Notes

## Version: 3.1.0
* Made the add-on compatible with Python2 and Python3

## Version: 3.0.0
* Migrated the add-on to pyTenable library
* Added "Sync Plugin Details" checkbox support for Tenable.io input
* Removed "Historical Fixed Vulnerability" checkbox support from Tenable.sc Mobile input

## Version: 2.0.4
* Fixed the issue with pulling deleted/terminated assets and fixed vulnerabilities

## Version: 2.0.3
* Fixed the issue of ingesting duplicate vulnerability events.
* Updated the checkpoint mechanism to store the latest time of an event for IO assets.

## Version: 2.0.2
* Fixed the validation issue while configuring cron interval with Splunk version less than 7.1.3 by adding dateutil python library.

## Version: 2.0.1
* Updated the checkpoint mechanism to store the latest time of an event for Vulnerability data.

## Version: 2.0.0
* Added data parsing for Tenable NNM
* Added support for proxy per account
* Added "Request Scan" and "Get Current Vulnerability" AR actions for Tenable.io
* Added support for mobile data

## Version: 1.0.6
* Moved macros from Technology Add-On For Tenable to Tenable App For Splunk.

# Upgrade to version 2.0.0

* Delete $SPLUNK_HOME/etc/apps/TA-tenable/local/macros.conf file if exist.
* Update definition of "get_tenable_index" macro in the Tenable App For Splunk.
* Edit account and add appropriate proxy settings if proxy settings are previously configured.
* Remove proxy stanza from $SPLUNK_HOME/etc/apps/TA-tenable/local/ta_tenable_settings.conf
* Delete already configured inputs before upgrading the TA.

# OPEN SOURCE COMPONENTS AND LICENSES
* Some of the components included in Tenable Add-on for Splunk are licensed under free or open source licenses. We wish to thank the contributors to those projects.

  * dateutil version 2.6.1 https://pypi.org/project/python-dateutil/ (LICENSE https://github.com/dateutil/dateutil/blob/master/LICENSE)
  * croniter version 0.3.25 https://pypi.org/project/croniter/ (LICENSE https://github.com/kiorky/croniter/blob/master/docs/LICENSE)
  * pytz version 2018.3 https://pypi.org/project/pytz/ (LICENSE https://github.com/stub42/pytz/blob/master/src/LICENSE.txt)
  * tzlocal version 1.5.1 https://pypi.org/project/tzlocal/ (LICENSE https://github.com/regebro/tzlocal/blob/master/LICENSE.txt)
  * pyTenable version 0.3.27 https://pypi.org/project/pyTenable/ (LICENSE https://github.com/tenable/pyTenable/blob/master/LICENSE)
  * arrow 0.15.2 https://pypi.org/project/arrow/ (LICENSE https://github.com/crsmithdev/arrow/blob/master/LICENSE)

# RECOMMENDED SYSTEM CONFIGURATION

* Splunk forwarder system should have 12 GB of RAM and a six-core CPU to run this Technology Add-on smoothly.

# TOPOLOGY AND SETTING UP SPLUNK ENVIRONMENT

* This Add-On can be set up in two ways:
 1) **Standalone Mode**: Install the Add-on app on a single machine. This single machine would serve as a Search Head + Indexer + Heavy forwarder for this setup


 2) **Distributed Environment**: Install Add-on on search head and Add-on on Heavy forwarder (for REST API).

    * Add-on resides on search head machine and accounts need to be configured here.
    * Add-on needs to be installed and configured on the Heavy forwarder system.
    * Execute the following command on Heavy forwarder to forward the collected data to the indexer.
      /opt/splunk/bin/splunk add forward-server <indexer_ip_address>:9997
    * On Indexer machine, enable event listening on port 9997 (recommended by Splunk).
    * Add-on needs to be installed on search head for CIM mapping

# INSTALLATION OF APP

* This Add-on can be installed through UI using "Manage Apps" or extract zip file directly into /opt/splunk/etc/apps/ folder.

# CONFIGURATION OF APP

* Navigate to Tenable Add-on, click on "Configuration" page, go to "Account" tab and then click "Add", fill in "Account Name", "Tenable Account Type", "Address" and "Verify SSL Certificate" then select the appropriate "Tenable Account Type" and fill in either "Access Key" and "Secret Key" or "Username" and  "Password" or "Certificate Filename", "Key Filename" and "Key Password" fields.

* Navigate to Tenable Add-on, click on new input and then select "Tenable.io" and fill the "Name", "Interval", "Index", "Global Account" and "Lowest Severity to Store" fields.

* Navigate to Tenable Add-on, click on new input and then select "Tenable.sc Vulnerability" and fill the "Name", "Interval", "Index", "Global Account", "Sync Plugin Details" fields.

* Navigate to Tenable Add-on, click on new input and then select "Tenable.sc Mobile" and fill the "Name", "Interval", "Index", "Global Account" fields.

* To configure "Tenable NNM" navigate to Settings > Data Inputs > TCP/UDP > Add new > Add port > Next > Select Source type as "tenable:nnm:vuln" > Select Index > Review > Done

# SAMPLE EVENT GENERATOR

* The TA-tenable, comes with sample data files, which can be used to generate sample data for testing. In order to generate sample data, it requires the SA-Eventgen application.
* Typically eventgen is disabled for the TA and it will generate sample data at an interval of 1 hour. You can update this configuration from eventgen.conf file available under $SPLUNK_HOME/etc/apps/TA-tenable/default/.

# ADAPTIVE RESPONSE ACTION

Following is the list of AR Actions for Tenable.io and Tenable.sc provided by the Add-On that can be used from the Enterprise Security App.

### Tenable.io
  1. **Get Vulnerability Summary from Tenable IO**: Get Current Vulnerability from Tenable IO.
  2. **Request Scan for Tenable IO**: Request a scan for Tenable IO asset.

### Tenable.sc
  1. **Get Vulnerability Summary from Tenable SC**: Get Current Vulnerability from Tenable SC server.
  2. **Launch Policy based Remediation Scan for Tenable SC**: Launch a policy based remediation scan on Tenable SC server.
  3. **Scan Machine for Tenable SC**: Start a scan for machine on Tenable SC server.


# TROUBLESHOOTING

* Environment variable SPLUNK_HOME must be set
* To troubleshoot tenable.io mod-input check $SPLUNK_HOME/var/log/splunk/ta_tenable_tenable_io.log file.
* To troubleshoot Tenable Security Center mod-input check $SPLUNK_HOME/var/log/splunk/ta_tenable_tenable_securitycenter.log file.
* To troubleshoot Tenable Security Center mobile mod-input check $SPLUNK_HOME/var/log/splunk/ta_tenable_tenable_securitycenter_mobile.log file.
* For tenable.sc Vulnerability and tenable.sc mobile Vulnerability if you have large number of data then it is recommended to update "page_size" in $SPLUNK_HOME/etc/apps/TA-tenable/default/inputs.conf and restart the Splunk.
* On distributed environment if events are getting dropped on forwarder then it is recommended to update "max_event_size" in $SPLUNK_HOME/etc/apps/TA-tenable/default/inputs.conf and restart the splunk.
* To troubleshoot "Get Vulnerability Summary from Tenable IO" AR Action check $SPLUNK_HOME/var/log/splunk/get_io_vulnerability_summary_modalert.log file.
* To troubleshoot "Request Scan for Tenable IO" AR Action check $SPLUNK_HOME/var/log/splunk/io_request_scan_modalert.log file.
* To troubleshoot "Get Vulnerability Summary from Tenable SC" AR Action check $SPLUNK_HOME/var/log/splunk/tenable_vulnerability_summary_modalert.log file.
* To troubleshoot "Launch Policy based Remediation Scan for Tenable SC" AR Action check $SPLUNK_HOME/var/log/splunk/launch_remediation_scan_modalert.log file.
* To troubleshoot "Scan Machine for Tenable SC" AR Action check $SPLUNK_HOME/var/log/splunk/activate_machine_scan_modalert.log file.

# UNINSTALL & CLEANUP STEPS

* Remove $SPLUNK_HOME/etc/apps/TA-tenable
* Remove $SPLUNK_HOME/var/log/splunk/**ta_tenable_tenable_io.log**
* Remove $SPLUNK_HOME/var/log/splunk/**ta_tenable_tenable_securitycenter.log** 
* Remove $SPLUNK_HOME/var/log/splunk/**ta_tenable_tenable_securitycenter_mobile.log**
* Remove $SPLUNK_HOME/var/log/splunk/**get_io_vulnerability_summary_modalert.log**
* Remove $SPLUNK_HOME/var/log/splunk/**io_request_scan_modalert.log**
* Remove $SPLUNK_HOME/var/log/splunk/**tenable_vulnerability_summary_modalert.log**
* Remove $SPLUNK_HOME/var/log/splunk/**launch_remediation_scan_modalert.log**
* Remove $SPLUNK_HOME/var/log/splunk/**activate_machine_scan_modalert.log**
* To reflect the cleanup changes in UI, Restart Splunk Enterprise instance

# SUPPORT

* Support Offered: Yes
* Support Email: support@tenable.com

### Copyright 2018 Tenable, Inc.
