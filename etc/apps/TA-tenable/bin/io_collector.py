import json
import time
import arrow
import tenable_utility as utility
from datetime import date
from tenable_collector import TenableCollector
from tenable.io import TenableIO
from tenable.errors import TioExportsError, ConnectionError


TIME_PATTERN = "%Y-%m-%dT%H:%M:%S.%fZ"


class IOCollector(TenableCollector):
    """The purpose of IOCollector is to fetch the vulnerability, asset, and plugin events from tenable io,
    transform them accordingly, and index them into splunk.
    """
    SEVERITIES = ["info", "low", "medium", "high", "critical"]

    def _event_transformer(self, event, sourcetype, time_filter):
        """Transforms, modifies and updates the received json event.

        Args:
            event (dict): vuln, asset, or plugin event
            sourcetype (str): sourcetype of the event
                            e.g. tenable:io:vuln, tenable:io:assets, tenable:io:plugin
            time_filter (str): asset and plugin time field on which to store the latest event time to respective cehckpoint

        Returns:
            dict, int: transformed event and epoch time on which to index the event
        """
        event["IO_address"] = self._account["address"]

        if sourcetype == "tenable:io:vuln":
            # process the event
            asset = event.pop("asset", {})
            event.update({
                "asset_uuid": asset.get("uuid"),
                "asset_fqdn": asset.get("fqdn"),
                "agent_uuid": asset.get("agent_uuid"),
                "ipv4": asset.get("ipv4"),
                "ipv6": asset.get("ipv6"),
                "vendor_severity": event.get("severity", ""),
                "state": event.get("state", "").lower(),
            })

            if event.get("state", "") == "fixed":
                # converting the date from ISO format to timestamp
                event_time = arrow.get(event.get("last_fixed")).timestamp
            else:
                event_time = arrow.get(event.get("last_found")).timestamp

            # we're converting severity value "info" to "informational" for consistency
            if event.get("severity", "").lower() == "info":
                event["severity"] = "informational"

            # we're stripping plugin output larger than the max_event_size integer due to Splunk event sizes
            if len(event.get("output", "")) > self.max_event_size:
                event["output"] = " ".join([
                    "Removed the original content as the original output was",
                    "{} characters,".format(len(event.get("output"))),
                    "which was more than the {}".format(self.max_event_size),
                    "character limit that was defined."
                ])
            checkpoint_time = event_time

        elif sourcetype == "tenable:io:assets":
            # process the event
            if time_filter == "deleted_at":
                event["state"] = "Deleted"
            elif time_filter == "terminated_at":
                event["state"] = "Terminated"
            else:
                event["state"] = "Active"
            event["uuid"] = event.pop("id", None)

            checkpoint_time = arrow.get(event.get(time_filter)).timestamp
            event_time = checkpoint_time
        elif sourcetype == "tenable:io:plugin":
            # for plugins we have time field under attributes key  
            attrs = event.pop("attributes", {})
            event.update(attrs)
            checkpoint_time = self.current_time
            # Cant use time_filter time as many plugins are super old
            event_time = time.time()

        # Tmax_event is reset to -1 at start of each pull of data type
        self.max_event_time = max(self.max_event_time, checkpoint_time)

        return event, event_time

    def write_event(self, event, sourcetype, time_filter):
        """Index the event into the splunk into given sourcetype.
        Events are transformed first before ingesting into the splunk.

        Args:
            event (dict): event to index
            sourcetype (str): sourcetype in which to index the events
            time_filter (str): time field value using which to save the checkpoint time
        """
        event, event_time = self._event_transformer(event, sourcetype, time_filter)
        parsed_event = json.dumps(event)

        event = self.helper.new_event(
            data=parsed_event, time=event_time, index=self.index, sourcetype=sourcetype, unbroken=True)
        self.event_writer.write_event(event)

    def _convert_tags(self):
        """Convert the old format of tags to newer one that pytenable library accepts.
        Old format: {"tag_key1": ["tag_value1", "tag_value2"...], "tag_key2": ...}
        New format: [("key1", "value1"), ("key2", "value2"), ...]
        """
        separated_tags = []
        for i in range(len(self._tags)-1, -1, -1):
            if isinstance(self._tags[i][1], list):
                tag = self._tags.pop(i)
                for j in range(len(tag[1])):
                    separated_tags.append((tag[0], tag[1][j]))

        self._tags = self._tags + separated_tags

    def _set_input_data(self):
        """Set Tenable IO input form fields and initialize tio object.
        """
        super(IOCollector, self)._set_input_data()

        lowest_severity = self.helper.get_arg("lowest_severity_to_store")
        self._severity = self.SEVERITIES[self.SEVERITIES.index(
            lowest_severity):]

        # we support both types tags format legacy - dictionary of key value pairs
        # and new - list of tuples of key value pairs
        self._tags = self.helper.get_arg("tags") if self.helper.get_arg("tags") else []
        if self._tags:
            try:
                # if the new tag format is used i.e [("key1", "value1"), ...] json.loads with fail with ValueError
                self._tags = list(json.loads(self._tags).items())
                self._convert_tags()
            except ValueError:
                self._tags = eval(self._tags, {"__builtins__": None}, {})
            except Exception as e:
                self._tags = []
                self.helper.log_error("Unexpected error occured while processing tags: {}".format(str(e)))

        self._fixed_vulnerability = utility.is_true(self.helper.get_arg("fixed_vulnerability"))
        self._sync_plugins = utility.is_true(self.helper.get_arg("sync_plugins"))

        try:
            self._tio = TenableIO(
                access_key=self._account["access_key"],
                secret_key=self._account["secret_key"],
                url="https://" + self._account["address"].strip("/"),
                proxies=self.proxies,
                vendor='Tenable',
                product='SplunkTA',
                build=self.build
            )
        except ConnectionError as e:
            self.helper.log_error("Tenable.io error occured while initializing connection: {}".format(str(e)))
            exit(0)

    def get_checkpoint(self, export_type, time_filter):
        """Return checkpoint based on export type and time filter field.

        Args:
            export_type (str): vulns, assets, or plugins
            time_filter (str): time field filter based on export
                                last_found - active vulns
                                last_fixed - patched vulns
                                updated_at - assets
                                deleted_at - assets
                                terminated_at - assets
                                last_run_date - plugins

        Returns:
            dict: checkpoint state dict
        """
        check_point_name = "{}_{}_{}".format(self.input_name, export_type, time_filter)
        self.helper.log_debug(
            "Check point name is {}".format(check_point_name))

        state = self.helper.get_check_point(check_point_name)
        self.helper.log_debug(
            "Check point state returned is {}".format(state))

        # in case if checkpoint is not found state value will be None,
        # so we are setting it to empty dict
        if not isinstance(state, dict):
            state = {}
        return state

    def save_checkpoint(self, export_type, time_filter, state):
        """Save checkpoint state with name formed from input name, export type, and time field.

        Args:
            export_type (str): vulns, assets, or plugins
            time_filter (str): time field filter based on export
                                last_found - active vulns
                                last_fixed - patched vulns
                                updated_at - assets
                                deleted_at - assets
                                terminated_at - assets
                                last_run_date - plugins
            state (dict): checkpoint state value
        """
        check_point_name = "{}_{}_{}".format(self.input_name, export_type, time_filter)
        self.helper.save_check_point(check_point_name, state)
        self.helper.log_debug(
            "Check point state saved is " + str(state))

    def _get_vulns(self, vuln_state, time_field):
        """Fetch and index vulnerbility data.
        Since field in the export is the epoch time of given time field from checkpoint.

        Args:
            vuln_state (list): state of the vulnerability
                            e.g. ["open", "reopened"] OR ["fixed"]
            time_field (str): last_found - active vulns, 0 - patched vulns
        """
        self.helper.log_info("Tenable.io vulns:{} data collection started".format(time_field))
        vuln_checkpoint = self.get_checkpoint("vulns", time_field)
        # collect events for fixed state vulns only if its not first invocation or fixed vuln checkbox is checked
        is_first_invocation = not vuln_checkpoint.get("since")
        self.max_event_time = -1

        if (not self._fixed_vulnerability) and is_first_invocation and time_field == "last_fixed":
            vuln_checkpoint["since"] = self.current_time
            self.save_checkpoint("vulns", time_field, vuln_checkpoint)
            self.helper.log_info("Tenable.io vulns:{} data collection skipped".format(time_field))
        else:
            vulns = self._tio.exports.vulns(
                severity=self._severity,
                state=vuln_state,
                tags=self._tags,
                **{time_field: int(vuln_checkpoint.get("since", self.start_time))}
            )
            for vuln in vulns:
                self.write_event(vuln, "tenable:io:vuln", time_field)
        if self.max_event_time != -1:
            # Adding 1 to max time for avoiding duplicate data
            vuln_checkpoint["since"] = self.max_event_time + 1
            self.save_checkpoint("vulns", time_field, vuln_checkpoint)
        self.helper.log_info("Tenable.io vulns:{} data collection completed".format(time_field))

    def _get_assets(self, time_field):
        """Fetch and index asset data.
        Since field in the export is the epoch time of given time field from checkpoint.

        Args:
            time_field (str): updated_at, deleted_at, or terminated_at
        """
        self.helper.log_info("Tenable.io assets:{} data collection started".format(time_field))
        asset_checkpoint = self.get_checkpoint("assets", time_field)
        # collect events for deleted or terminated state assets only if its not first invocation
        is_first_invocation = not asset_checkpoint.get("since")
        self.max_event_time = -1

        if is_first_invocation and time_field in ["deleted_at", "terminated_at"]:
            asset_checkpoint["since"] = self.current_time
            self.save_checkpoint("assets", time_field, asset_checkpoint)
            self.helper.log_info("Tenable.io assets:{} data collection skipped".format(time_field))
        else:
            assets = self._tio.exports.assets(
                chunk_size=1000,
                tags=self._tags,
                **{time_field: int(asset_checkpoint.get("since", self.start_time))}
            )
            for asset in assets:
                self.write_event(asset, "tenable:io:assets", time_field)
        if self.max_event_time != -1:
            # Adding 1 to max time for avoiding duplicate data
            asset_checkpoint["since"] = self.max_event_time + 1
            self.save_checkpoint("assets", time_field, asset_checkpoint)
        self.helper.log_info("Tenable.io assets:{} data collection completed".format(time_field))

    def _get_plugins(self, time_field):
        """Fetch and index plugin data.
        Since field in the export is the epoch time of given time field from checkpoint.

        Args:
            time_field (str): last_run_date
        """
        if not self._sync_plugins:
            self.helper.log_info("Tenable.io plugins:{} data collection skipped as sync plugin is not checked".format(time_field))
            return

        self.helper.log_info("Tenable.io plugins:{} data collection started".format(time_field))
        plugin_checkpoint = self.get_checkpoint("plugins", time_field)
        plugin_modification_time = plugin_checkpoint.get("since", self.start_time)
        plugin_modification_date = date.fromtimestamp(plugin_modification_time)
        # Only collect plugin data if the difference between current time and the last input invocation time
        # is greater or equal to 24 hrs. Added this because the API only has the fidelity of date.
        # Note: This won't prevent data duplication completely but will reduce multiple duplications to only once.
        time_diff = self.current_time - int(plugin_modification_time)
        is_first_invocation = not plugin_checkpoint.get("since")
        if not is_first_invocation and time_diff < 86400:
            self.helper.log_info("Tenable.io plugins:{} data collection skipped to reduce data duplication. "
                                 "Time diff between last invocation is: {} second(s)".format(time_field, time_diff))
            return
        plugins = self._tio.plugins.list(last_updated=plugin_modification_date)
        self.max_event_time = -1
        for plugin in plugins:
            self.write_event(plugin, "tenable:io:plugin", time_field)
        if self.max_event_time != -1:
            # Adding 1 to max time for avoiding duplicate data
            plugin_checkpoint["since"] = self.max_event_time + 1
            self.save_checkpoint("plugins", time_field, plugin_checkpoint)
        self.helper.log_info("Tenable.io plugins:{} data collection completed".format(time_field))

    def collect_events(self):
        """Collect vulnerabilities, assets, and plugins of tenable io based on given filters.
        """
        # grab all iterators at the same time and iterate them over parallely
        self.helper.log_info("Tenable.io data collection started for input: {}".format(self.input_name))
        try:
            # get active vulns
            self._get_vulns(["open", "reopened"], "last_found")
        except TioExportsError as e:
            self.helper.log_error("Tenable.io exports error occured during opened/reopened vulns data collection: {}".format(str(e)))
        except Exception as e:
            self.helper.log_error(
                "Failed to collect open/reopened vulnerabilities Error: {}".format(str(e)))
        try:
            # get fixed vulns
            self._get_vulns(["fixed"], "last_fixed")
        except TioExportsError as e:
            self.helper.log_error("Tenable.io exports error occured during fixed vulns data collection: {}".format(str(e)))
        except Exception as e:
            self.helper.log_error(
                "Failed to collect fixed vulnerabilities - Error: {}".format(str(e)))

        try:
            # get active assets
            self._get_assets("updated_at")
        except TioExportsError as e:
            self.helper.log_error("Tenable.io exports error occured during active assets data collection: {}".format(str(e)))
        except Exception as e:
            self.helper.log_error(
                "Failed to collect active assets Error: {}".format(str(e)))
        try:
            # get deleted assets
            self._get_assets("deleted_at")
        except TioExportsError as e:
            self.helper.log_error("Tenable.io exports error occured during deleted assets data collection: {}".format(str(e)))
        except Exception as e:
            self.helper.log_error(
                "Failed to collect deleted assets Error: {}".format(str(e)))
        try:
            # get terminated assets
            self._get_assets("terminated_at")
        except TioExportsError as e:
            self.helper.log_error("Tenable.io exports error occured during terminated assets data collection: {}".format(str(e)))
        except Exception as e:
            self.helper.log_error(
                "Failed to collect terminated assets Error: {}".format(str(e)))

        try:
            # get plugins
            self._get_plugins("plugin_modification_date")
        except Exception as e:
            self.helper.log_error(
                "Failed to collect plugins Error: {}".format(str(e)))
        self.helper.log_info("Tenable.io data collection completed for input: {}".format(self.input_name))
