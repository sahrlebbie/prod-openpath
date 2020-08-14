import json
import splunk.entity as entity
import splunk.rest as rest

from ar_action_utility import get_passwords, get_certs_path
from tenable_utility import get_proxy_settings, is_true, get_app_version

from tenable.io import TenableIO
from custom_http_adapter import CustomHTTPAdapter
from tenable.sc import TenableSC


class ArActionUtil(object):
    """ArActionUtil is a base class for IOUtil and SCUtil and keeps common parameters stored
    """
    def __init__(self, event, helper):
        self.event = event
        self.helper = helper
        self.session_key = self.helper.session_key
        self.app_name = self.helper.ta_name
        self.build = get_app_version(self.app_name)


class IOUtil(ArActionUtil):
    """IOUtil allows Tenable IO related AR actions to use common methods for making connections
    to IO instance
    """
    def __init__(self, event, helper):
        """Init method for IOUtil

        Args:
            ArActionUtil (object): Base class having some common variables
            event (dict): event received from splunk to perform ar action
            helper (object): object of ModularAlertBase
        """
        super(IOUtil, self).__init__(event, helper)
        self._set_input_data()

    def _set_input_data(self):
        """Set IO fields required to connect and initialize TenableIO object.
        """
        self.userinfo = None
        self.address = self.event.get("IO_address")
        self.source = str(self.event.get("orig_source", "")).split("|")
        if len(self.source) > 1 and str(self.address) == str(self.source[1]):
            self.userinfo = str(self.source[0])

        # get credentials
        _, content = rest.simpleRequest(
            "/servicesNS/nobody/TA-tenable/configs/conf-ta_tenable_account",
            sessionKey=self.session_key,
            getargs={"output_mode": "json"},
            raiseAllErrors=True)
        account_data = json.loads(content)["entry"]
        for i in range(len(account_data)):
            ga = account_data[i].get("name")
            _, content = rest.simpleRequest(
                "/servicesNS/nobody/TA-tenable/configs/conf-ta_tenable_account/"
                + ga,
                sessionKey=self.session_key,
                getargs={"output_mode": "json"},
                raiseAllErrors=True)
            data = json.loads(content)["entry"]
            content = data[0]["content"]
            name = ""
            verify_ssl = "0"
            addr = None
            if content.get("tenable_account_type") == "tenable_io":
                addr = content.get("address")
                verify_ssl = content.get("verify_ssl")
                if addr == self.address or not self.userinfo:
                    name = data[0]["name"]
            # if an account found exit the loop
            if name:
                break

        self.name = name
        self.verify_ssl = is_true(verify_ssl)

        account_info = data[0]["content"]
        if not self.name:
            if self.userinfo:
                msg = "Global Account of type tenable_io with Address: {} and Username: {} not found".format(
                    self.address, self.userinfo)
            else:
                msg = "Global Account of type tenable_io not found"
            raise Exception(msg)

        creds = get_passwords(self.name, self.app_name, self.session_key)
        self.access_key = creds.get("access_key", "")
        self.secret_key = creds.get("secret_key", "")
        self.proxies = get_proxy_settings(global_account_dict=account_info)

        self.tio = TenableIO(
            access_key=self.access_key,
            secret_key=self.secret_key,
            url="https://" + self.address,
            proxies=self.proxies,
            vendor='Tenable',
            product='SplunkTA',
            build=self.build
        )


class SCUtil(ArActionUtil):
    """SCUtil allows Tenable SC related AR actions to use common methods for making connections
    to SC instance
    """
    def __init__(self, event, helper):
        """Init method for IOUtil

        Args:
            ArActionUtil (object): Base class having some common variables
            event (dict): event received from splunk to perform ar action
            helper (object): object of ModularAlertBase
        """
        super(SCUtil, self).__init__(event, helper)
        # scan_name required only for request span ar action
        self.scan_name = self.helper.get_param("scan_name")

        self.name = ""
        self.verify_ssl = 0
        self.auth_type = "credentials"
        self.addr = None
        self.user = None
        self.certificate_path = None
        self.key_file_path = None
        self._set_input_data()

    def _set_input_data(self):
        """Set SC fields required to connect and initialize TenableSC object.
        """
        self.userinfo = None
        self.address = self.event.get("SC_address")
        self.source = str(self.event.get("orig_source", "")).split("|")
        if len(self.source) > 1 and str(self.address) == str(self.source[1]):
            self.userinfo = str(self.source[0])

        # get credentials
        _, content = rest.simpleRequest(
            "/servicesNS/nobody/TA-tenable/configs/conf-ta_tenable_account",
            sessionKey=self.session_key,
            getargs={"output_mode": "json"},
            raiseAllErrors=True)
        account_data = json.loads(content)["entry"]
        for i in range(len(account_data)):
            ga = account_data[i].get("name")
            _, content = rest.simpleRequest(
                "/servicesNS/nobody/TA-tenable/configs/conf-ta_tenable_account/"
                + ga,
                sessionKey=self.session_key,
                getargs={"output_mode": "json"},
                raiseAllErrors=True)
            data = json.loads(content)["entry"]
            content = data[0]["content"]

            name = ""
            verify_ssl = "0"
            auth_type = "credentials"
            addr = None
            user = None
            certificate_path = None
            key_file_path = None
            if content.get("tenable_account_type"
                           ) == "tenable_securitycenter_credentials":
                addr = content.get("address")
                user = content.get("username", "")
                verify_ssl = content.get("verify_ssl")
                if (addr == self.address
                        and user == self.userinfo) or (not self.userinfo):
                    name = data[0]["name"]

            elif content.get("tenable_account_type"
                             ) == "tenable_securitycenter_certificate":
                auth_type = "certificate"
                addr = content.get("address")
                certificate_path = content.get("certificate_path")
                key_file_path = content.get("key_file_path")
                verify_ssl = content.get("verify_ssl")
                if (addr == self.address and certificate_path == self.userinfo
                    ) or (not self.userinfo):
                    name = data[0]["name"]
            if name:
                break

        self.user = user
        self.verify_ssl = is_true(verify_ssl)
        self.name = name
        self.auth_type = auth_type
        self.certificate_path = certificate_path
        self.key_file_path = key_file_path

        self.account_info = data[0]["content"]

        # if no account found raise exception
        if not self.name:
            if self.userinfo:
                msg = "Global Account of type tenable_sc with Address: {} and Username/Certificate: {} not found".format(
                    self.address, self.userinfo)
            else:
                msg = "Global Account of type tenable_sc not found"
            raise Exception(msg)

        creds = get_passwords(self.name, self.app_name, self.session_key)
        self.password = creds.get("password", "")
        self.certificate_key_password = creds.get("key_password", "")
        self.account_info["proxy_password"] = creds.get("proxy_password", "")
        self.proxies = get_proxy_settings(
            global_account_dict=self.account_info)

        # create TenableSC connection
        if self.auth_type == "certificate":
            self.certificate_path, self.key_file_path = get_certs_path(
                self.app_name, self.certificate_path, self.key_file_path)
            adapter = CustomHTTPAdapter(certfile=self.certificate_path,
                                        keyfile=self.key_file_path,
                                        password=self.certificate_key_password)
            self.tsc = TenableSC(self.address,
                                 ssl_verify=self.verify_ssl,
                                 proxies=self.proxies,
                                 adapter=adapter)
        else:
            self.tsc = TenableSC(self.address,
                                 ssl_verify=self.verify_ssl,
                                 proxies=self.proxies)
            self.tsc.login(self.user, self.password)