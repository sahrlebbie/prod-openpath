import json
import time
import tenable_utility as utility
from tenable.sc import TenableSC
from custom_http_adapter import CustomHTTPAdapter
from tenable_collector import TenableCollector
from tenable.errors import ConnectionError


class SCCollector(TenableCollector):
    def _set_input_data(self):
        """Set Tenable SC input form fields and initialize tio object.
        """
        super(SCCollector, self)._set_input_data()
        self._severity_map = {
            0: "informational",
            1: "low",
            2: "medium",
            3: "high",
            4: "critical"
        }
        self._check_point_name = self.input_name + "_" + self.analysis_type
        self._check_point = self.helper.get_check_point(self._check_point_name) or {}
        self.fixed_vulnerability = utility.is_true(self.fixed_vulnerability)
        self._sync_plugins = utility.is_true(self.helper.get_arg("sync_plugins"))
        self._query_name = self.helper.get_arg("query_name")
        self._verify_ssl = utility.is_true(self._account["verify_ssl"])
        try:
            self._page_size = int(self.helper.get_arg("page_size"))
        except (ValueError, TypeError) as e:
            self.helper.log_error("Tenable.sc error occured while setting page size (defaulting page size to 1000): {}".format(str(e)))
            self._page_size = 1000
        try:
            if self._account.get("certificate_path") != None:
                self._source = self._account["certificate_path"] + self._account["address"]
                certificate_path, key_file_path = utility.get_certificate_path(
                    self.app_name,
                    self._account["certificate_path"],
                    self._account["key_file_path"])
                certificate_key_password = self._account.get("key_password", '')
                adapter = CustomHTTPAdapter(
                    certfile=certificate_path,
                    keyfile=key_file_path,
                    password=certificate_key_password)
                self._tsc = TenableSC(
                    self._account["address"].strip('/'),
                    ssl_verify=self._verify_ssl,
                    proxies=self.proxies,
                    adapter=adapter,
                    vendor='Tenable',
                    product='SplunkTA',
                    build=self.build
                )
            else:
                self._source = self._account["username"] + self._account["address"]
                self._tsc = TenableSC(self._account["address"].strip("/"), ssl_verify=self._verify_ssl, proxies=self.proxies)
                self._tsc.login(self._account["username"], self._account["password"])
        except ConnectionError as e:
            self.helper.log_error("Tenable.sc error occured while initializing connection: {}".format(str(e)))
            exit(0)

        # fetch query filters from the given query name
        # these additional filters found are added while fetching the analysis data
        self._query_id = None
        if self._query_name:
            self._query_id = self._get_query_id(self._query_name)

    def _vuln_event_transformer(self, event, time_filter, is_first_invocation=False):
        """Transforms, modifies and updates the received json event.

        Args:
            event (dict): vuln, asset, or plugin event
            time_filter (str): time field filter e.g. lastSeen or lastMitigated
            is_first_invocation (bool, optional): Check if it is the first invocation of mod input.
                                                Set state of vuln to open if True. Defaults to False.

        Returns:
            dict, int: transformed event and epoch time on which to index the event
        """
        event["custom_severity"] = True if str(event.get("recastRisk", "0")) == "1" else False
        event["acceptRisk"] = True if str(event.get("acceptRisk")) == "1" else False
        event["hasBeenMitigated"] = True if str(event.get("hasBeenMitigated")) == "1" else False
        event["recastRisk"] = True if str(event.get("recastRisk")) == "1" else False

        severity_info = event.pop("severity")
        event["severity_id"] = severity_info.get("id", "")
        event["vendor_severity"] = severity_info.get("name", "")
        event["severity_description"] = severity_info.get("description", "")

        event["severity"] = self._severity_map.get(int(event["severity_id"]), "")
        event["plugin_id"] = event.get("pluginID")

        event_size = len(json.dumps(event))
        if event_size > self.max_event_size and event.get("pluginText"):
            self.helper.log_debug("Tenable Debug: Removing \"pluginText\" field from the result as event size is {}, which is greater than {} bytes.".format(event_size, self.max_event_size))
            event["pluginText"] = "Removed original content as event size is {}, which is greater than {} bytes.".format(event_size, self.max_event_size)

        first_seen = int(event.get("firstSeen", time.time()))
        last_seen = int(event.get("lastSeen", time.time()))

        # for patched vulns set state of vuln to fixed
        if time_filter == "lastMitigated":
            event["state"] = "fixed"
        else:
            # for vulns fetched in first run set their state to open
            if is_first_invocation:
                event["state"] = "open"
            else:
                # if lastSeen is equal to firstSeen
                # then vulnerability is seen for the first time
                # so set its state to open
                # otherwise it is reopened
                if last_seen == first_seen:
                    event["state"] = "open"
                else:
                    event["state"] = "reopened"
        event_time = last_seen

        return event, event_time

    def write_event(self, event, event_time, sourcetype):
        """Index the event into the splunk into given sourcetype.
        Events are transformed first before ingesting into the splunk.

        Args:
            event (dict): event to index
            event_time (int): epoch time on which index the event
            sourcetype (str): sourcetype in which to index the events
        """
        # set the securitycenter url in all the events
        event["SC_address"] = self._account["address"]

        parsed_event = json.dumps(event)
        event = self.helper.new_event(data=parsed_event, time=event_time, host=None, index=self.index,
                                      source=self._source, sourcetype=sourcetype, done=True, unbroken=True)
        self.event_writer.write_event(event)

    def _get_query_id(self, query_name):
        """Get filters of the given query. Query name must be of type vulndetails and should be unique.

        Args:
            query_name (str): query name for which to find the filters

        Raises:
            Exception: if multiple queries with same name is found or if it not of type vulndetails

        Returns:
            int: id of the found query
        """
        fields = ["id", "name", "filters", "tool"]
        response = self._tsc.queries.list(fields=fields)

        found_query = False
        query_info = None
        found_query_with_other_tool = False

        for query in response.get("usable"):
            if query["name"] == query_name and query["tool"] == "vulndetails":
                if found_query:
                    msg = "Multiple query IDs found with given query name {}".format(query_name)
                    self.helper.log_error("Tenable.sc Error: {}".format(msg))
                    raise Exception(msg)
                else:
                    query_info = query
                    found_query = True
            elif query["name"] == query_name and query["tool"] != "vulndetails":
                found_query_with_other_tool = True

        if not query_info and found_query_with_other_tool:
            msg = "Provided query must be for a Vulnerability Detail List tool."
            self.helper.log_error.error("Tenable.sc Error: " + msg)
            raise Exception(msg)

        return int(query_info["id"])

    def _get_current_user(self):
        """Get details of the current user logged in tenable.sc server.

        Returns:
            dict: current user details
        """
        return self._tsc.current.user()

    def get_organization(self):
        """Get organization details of the current user.
        Organization details are added while indexing each event of asset into splunk.

        Returns:
            str: organization of the current user
        """
        return self._get_current_user().get("organization", {})

    def _get_analysis_data(self, tool, sort_field, source, time_filter, checkpoint_time_field):
        """Get analysis data based filter params.
        This method is common for fetching active vulns, patched vulns, and assets.
        Fetches the checkpoint, forms the params, and filters to get the analysis data accordingly.

        Args:
            tool (str): The analysis tool for formatting and returning a specific view into the information.
                        e.g. vulndetails(for vulns), and sumip(for assets)
            sort_field (str): The field to sort the results on.
                        e.g. severity(for vulns), and score(for assets)
            source (str): The data source location.
                        e.g. cumulative(for active vulns and assets), and patched(for fixed vulns)
            time_filter (str): Time filter to use while getting analysis data.
                        e.g. lastSeen(for active vulns and assets), and lastMitigated(for patched vulns)
                        Time from which to fetch the data
            checkpoint_time_field (str): Checkpoint time field.
                        e.g. vuln_last_run_date(for vulns), assets_last_run_date(for assets)

        Returns:
            object: AnalysisResultsIterator object
        """
        # active vulns
        params = {
            "tool": tool,
            "sort_field": sort_field,
            "source": source,
            "sort_direction": "desc",
            "limit": self._page_size
        }

        if self._query_id != None:
            params.update({"query_id": self._query_id})

        last_run_date = self._check_point.get(checkpoint_time_field, self.start_time)
        filters = [(time_filter, "=", str(last_run_date) + "-" + str(self.current_time))]
        return self._tsc.analysis.vulns(*filters, **params)

    def _get_mobile_analysis_data(self, tool, sort_field, time_filter, checkpoint_time_field):
        """Get mobile analysis data.
        All the mobile data will get collected every time from start of epoch.

        Args:
            tool (str): The analysis tool for formatting and returning a specific view into the information.
                        e.g. vulndetails - mobile vulns, sumdeviceid - mobile assets
            sort_field (str): The field to sort the results on.
                        e.g. severity - mobile vulns, score - mobile assets
            time_filter (str): Time filter to use while getting analysis data.
                        e.g. lastSeen(for active mobile vulns and assets)
                        Time from which to fetch the data
            checkpoint_time_field (str): Checkpoint time field.
                        e.g. vuln_last_run_date(for mobile vulns), assets_last_run_date(for mobile assets)

        Returns:
            object: AnalysisResultsIterator
        """
        params = {
            "tool": tool,
            "sort_field": sort_field,
            "sort_direction": "desc",
            "limit": self._page_size
        }

        if self._query_id != None:
            params.update({"query_id": self._query_id})

        # currently on using the the time filter, nothing is getting collected
        # if the time filter is not passed the all the data from epoch will get collected every time
        # last_run_date = self._check_point.get(checkpoint_time_field, self.start_time)
        # filters = [(time_filter, "=", str(last_run_date) + "-" + str(self.current_time))]
        return self._tsc.analysis.mobile(**params)

    def _get_vulns(self):
        """Get vulnerability analysis data and index the events into splunk after event transformation.
        Only on successful data completion of all vulns,
        the checkpoint field `vuln_last_run_date` is saved with latest time of the fetched events plus 1 second(to avoid duplication on next run).
        """
        # is mod input invoked for the first time is determined based on checkpoint value
        # if checkpoint returns value then it is not the first invocation
        is_first_invocation = not self._check_point.get("vuln_last_run_date")

        # set sourcetype based on anlysis
        sourcetype = "tenable:sc:vuln" if self.analysis_type == "sc_vuln" else "tenable:sc:mobile:vuln"
        max_event_time = -1

        self.helper.log_info("Tenable.sc {} vulns data collection started".format(self.analysis_type))

        # decide what type of active vulns data to fetch based on analysis type
        if self.analysis_type == "sc_vuln":
            active_vulns = self._get_analysis_data("vulndetails", "severity", "cumulative", "lastSeen", "vuln_last_run_date")
        elif self.analysis_type == "sc_mobile":
            active_vulns = self._get_mobile_analysis_data("vulndetails", "severity", "lastSeen", "vuln_last_run_date")

        for vuln in active_vulns:
            vuln, event_time = self._vuln_event_transformer(vuln, "lastSeen", is_first_invocation)
            max_event_time = max(max_event_time, event_time)
            self.write_event(vuln, event_time, sourcetype)

        # get patched vulns
        # we collect the patched vulns only either get fixed vuln checkbox is toggled on
        # or if it is not the first invocation
        if self.analysis_type == "sc_vuln" and (self.fixed_vulnerability or not is_first_invocation):
            patched_vulns = self._get_analysis_data("vulndetails", "severity", "patched", "lastMitigated", "vuln_last_run_date")
            for vuln in patched_vulns:
                vuln, event_time = self._vuln_event_transformer(vuln, "lastMitigated")
                max_event_time = max(max_event_time, event_time)
                self.write_event(vuln, event_time, sourcetype)
        # update the checkpoint only if data found
        if max_event_time != -1:
            # Adding 1 to max time for avoiding duplicate data
            self._check_point["vuln_last_run_date"] = max_event_time + 1
            self.helper.save_check_point(self._check_point_name, self._check_point)
        self.helper.log_info("Tenable.sc {} vulns data collection completed".format(self.analysis_type))

    def _get_assets(self):
        """Get asset analysis data and index the events into Splunk.
        Only on successful data completion of all assets,
        the checkpoint field `assets_last_run_date` is saved with mod input invocation time plus 1 second.
        """
        # set sourcetype based on anlysis
        sourcetype = "tenable:sc:assets" if self.analysis_type == "sc_vuln" else "tenable:sc:mobile:assets"

        self.helper.log_info("Tenable.sc {} assets data collection started".format(self.analysis_type))

        # decide what type of assets to fetch based on analysis type
        if self.analysis_type == "sc_vuln":
            assets = self._get_analysis_data("sumip", "score", "cumulative", "lastSeen", "assets_last_run_date")
        elif self.analysis_type == "sc_mobile":
            assets = self._get_mobile_analysis_data("sumdeviceid", "score", "lastSeen", "assets_last_run_date")

        # get organization details of current user
        organization = self.get_organization()
        for asset in assets:
            asset["organization"] = organization
            self.write_event(asset, time.time(), sourcetype)

        self._check_point["assets_last_run_date"] = self.current_time + 1
        self.helper.save_check_point(self._check_point_name, self._check_point)
        self.helper.log_info("Tenable.sc {} assets data collection completed".format(self.analysis_type))

    def _get_plugins(self):
        """Get all plugins from tenable sc and index the events into Splunk.
        """

        # plugins should not collected for mobile type
        # and collect them only if checkbox is selected
        if self.analysis_type != "sc_vuln" or not self._sync_plugins:
            self.helper.log_info("Tenable.sc {} skipping plugins data collection for input: {}".format(self.analysis_type, self.input_name))
            return

        self.helper.log_info("Tenable.sc {} plugins data collection started".format(self.analysis_type))
        plugin_last_run_date = self._check_point.get("plugin_last_run_date", self.start_time)

        plugins = self._tsc.plugins.list(
            filter=("pluginModDate", "gte", str(plugin_last_run_date)),
            fields=["name", "description", "family", "type", "copyright", "version", "sourceFile", "dependencies", "requiredPorts", "requiredUDPPorts", "cpe", "srcPort", "dstPort", "protocol", "riskFactor", "solution", "seeAlso", "synopsis", "checkType",
                    "exploitEase", "exploitAvailable", "exploitFrameworks", "cvssVector", "cvssVectorBF", "baseScore", "temporalScore", "stigSeverity", "pluginPubDate", "pluginModDate", "patchPubDate", "patchModDate", "vulnPubDate", "modifiedTime", "md5", "xrefs"],
            sort_field="modifiedTime",
            sort_direction="desc"
        )

        for plugin in plugins:
            self.write_event(plugin, time.time(), "tenable:sc:plugin")

        self._check_point["plugin_last_run_date"] = self.current_time + 1
        self.helper.save_check_point(self._check_point_name, self._check_point)
        self.helper.log_info("Tenable.sc {} plugins data collection completed".format(self.analysis_type))

    def collect_events(self):
        """Collect vulnerabilities, assets, and plugins of Tenable.sc based on given filters.
        """
        self.helper.log_info("Tenable.sc data collection started for input: {}".format(self.input_name))
        try:
            # get active vulns
            self._get_vulns()
        except Exception as e:
            self.helper.log_error(
                "Tenable.sc {} Failed to collect vulnerabilities. {}".format(self.analysis_type, str(e)))

        try:
            # get assets
            self._get_assets()
        except Exception as e:
            self.helper.log_error(
                "Tenable.sc {} Failed to collect assets. {}".format(self.analysis_type, str(e)))

        try:
            # get plugins
            self._get_plugins()
        except Exception as e:
            self.helper.log_error(
                "Tenable.sc {} Failed to collect plugins. {}".format(self.analysis_type, str(e)))
        self.helper.log_info("Tenable.sc data collection completed for input: {}".format(self.input_name))
        self._tsc.logout()
