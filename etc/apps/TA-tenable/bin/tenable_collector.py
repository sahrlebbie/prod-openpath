# python imports
import time
import json
import arrow
import tenable_utility as utility
import splunk.rest as rest


TIME_PATTERN = "%Y-%m-%dT%H:%M:%SZ"


class TenableCollector(object):
    """Base class for tenable io and sc collectors.
    This class sets the common input params for io and sc.
    Along with that it also waits on kvstore to be in ready state,
    because the add-on uses it for maintaining the time checkpoints.
    """
    def __init__(self, helper, ew, analysis_type=None):
        """
        Args:
            helper (object): object of BaseModInput class
            ew (object): object of event writer class
            analysis_type (str, optional): type of analysis e.g. vuln or mobile.
                                    Defaults to None.
        """
        self.helper = helper
        self.event_writer = ew
        self.app_name = helper.get_app_name()
        self.build = utility.get_app_version(self.app_name)
        self.analysis_type = analysis_type
        self._wait_for_kvstore()
        self._set_input_data()
        self.current_time = int(time.time())
        

    def _wait_for_kvstore(self):
        """Wait for KV store to initialize.
        KV store is used for maintaining time checkpoints for all the different exports.

        Raises:
            Exception: when kv store is not in ready state
        """
        def get_status():
            _, content = rest.simpleRequest("/services/kvstore/status",
                                            sessionKey=session_key,
                                            method="GET",
                                            getargs={"output_mode": "json"},
                                            raiseAllErrors=True)
            data = json.loads(content)["entry"]
            return data[0]["content"]["current"].get("status")

        session_key = self.helper.context_meta["session_key"]
        counter = 0
        status = get_status()
        while status != "ready":
            if status == "starting":
                counter += 1
                if counter < 3:
                    time.sleep(30)
                    status = get_status()
                    continue
            self.helper.log_error("KV store is not in ready state. Current state: " + str(status))
            raise Exception(
                "KV store is not in ready state. Current state: " + str(status))

    def _set_input_data(self):
        """Set common imput form fields for data collection.
        """
        self.input_name = self.helper.get_input_stanza_names()
        self.interval = self.helper.get_arg("interval")
        self.index = self.helper.get_arg("index")
        self._account = self.helper.get_arg("global_account")
        self.start_time = self.helper.get_arg("start_time") if self.helper.get_arg(
            "start_time") else "1970-01-01T00:00:00Z"
        self.start_time = arrow.get(self.start_time).timestamp
        self.fixed_vulnerability = self.helper.get_arg("fixed_vulnerability")
        self.max_event_size = int(self.helper.get_arg("max_event_size")) if self.helper.get_arg(
            "max_event_size") else 67108864
        self.proxies = utility.get_proxy_settings(global_account_dict=self._account)
