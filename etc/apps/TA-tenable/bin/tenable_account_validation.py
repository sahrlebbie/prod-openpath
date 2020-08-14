import os
import io
import sys
import json
import requests
import six.moves.configparser

import splunk.admin as admin
import splunk.entity as entity
from splunk.clilib.bundle_paths import make_splunkhome_path
from splunktaucclib.rest_handler.endpoint.validator import Validator
from tenable_utility import get_proxy_settings, is_true, get_app_version
from tenable.io import TenableIO as TIO
from tenable.sc import TenableSC as TSC
from custom_http_adapter import CustomHTTPAdapter
from distutils.version import LooseVersion
from ssl import SSLError


class GetSessionKey(admin.MConfigHandler):
    def __init__(self):
        self.session_key = self.getSessionKey()


class Utility:
    def __init__(self, *args, **kwargs):
        self._args = args
        self._kwargs = kwargs

    def get_entities(self, app_name):
        session_key_obj = GetSessionKey()
        session_key = session_key_obj.session_key
        return entity.getEntities(['admin', 'passwords'], namespace=app_name, owner='nobody', sessionKey=session_key, search=app_name)

    def get_access_key(self, app_name, global_account_name):
        for _, value in self.get_entities(app_name).items():
            if value['username'].partition('`')[0] == str(global_account_name) and not value['clear_password'].startswith('`'):
                cred = json.loads(value['clear_password'])
                return cred.get('access_key', '')

    def get_proxy(self, data):
        return get_proxy_settings(global_account_dict=data)

    def check_uniqueness_of_account(self, path, app_name, tenable_account_name, tenable_account_type, address, username, certficate_path, access_key):
        account_parser_obj = six.moves.configparser.ConfigParser()
        account_conf = os.path.join(make_splunkhome_path(
            [path, "local/ta_tenable_account.conf"]))
        stanzas = []
        if os.path.isfile(account_conf):
            with io.open(account_conf, 'r', encoding='utf_8_sig') as accountconffp:
                account_parser_obj.readfp(accountconffp)
            stanzas = account_parser_obj.sections()
        msg = ''
        for stanza in stanzas:
            if stanza == tenable_account_name:
                continue
            tenable_account_found = account_parser_obj.get(
                stanza, 'tenable_account_type')
            if tenable_account_found == tenable_account_type == "tenable_securitycenter_credentials" and address == account_parser_obj.get(stanza, 'address') and username == account_parser_obj.get(stanza, 'username'):
                msg = "Account with same Address and Username already exists!"
            elif tenable_account_found == tenable_account_type == "tenable_securitycenter_certificate" and address == account_parser_obj.get(stanza, 'address') and certficate_path == account_parser_obj.get(stanza, 'certificate_path'):
                msg = "Account with same Address and Certificate already exists!"
            elif tenable_account_found == tenable_account_type == "tenable_io" and address == account_parser_obj.get(stanza, 'address') and access_key == self.get_access_key(app_name, stanza):
                msg = "Account with same Address and Access Key already exists!"
        return msg


class Address(Validator):
    def __init__(self, *args, **kwargs):
        """

        :param validator: user-defined validating function
        """
        super(Address, self).__init__()
        self._args = args
        self._kwargs = kwargs

    def validate(self, value, data):
        return True


class Proxy(Validator):
    def __init__(self, *args, **kwargs):
        """

        :param validator: user-defined validating function
        """
        super(Proxy, self).__init__()
        self._args = args
        self._kwargs = kwargs

    def validate(self, value, data):
        try:
            if data.get('proxy_enabled', 'false').lower() not in ['0', 'false', 'f']:
                if not data.get('proxy_url'):
                    msg = 'Proxy Host can not be empty'
                    raise Exception(msg)
                elif not data.get('proxy_port'):
                    msg = 'Proxy Port can not be empty'
                    raise Exception(msg)
                elif (data.get('proxy_username') and not data.get('proxy_password')) or (not data.get('proxy_username') and data.get('proxy_password')):
                    msg = 'Please provide both proxy username and proxy password'
                    raise Exception(msg)
                elif not data.get('proxy_type'):
                    msg = 'Proxy Type can not be empty'
                    raise Exception(msg)
        except Exception as exc:
            self.put_msg(exc)
            return False
        else:
            return True


class TenableAccountType(Validator):
    def __init__(self, *args, **kwargs):
        """

        :param validator: user-defined validating function
        """
        super(TenableAccountType, self).__init__()
        self._args = args
        self._kwargs = kwargs

    def validate(self, value, data):
        try:
            if data["tenable_account_type"] == "tenable_io":
                if not data["access_key"]:
                    msg = "Account Type Tenable.io is selected but Access Key is not provided!"
                    raise Exception(msg)
                elif not data["secret_key"]:
                    msg = "Account Type Tenable.io is selected but Secret Key is not provided!"
                    raise Exception(msg)
            elif data["tenable_account_type"] == "tenable_securitycenter_credentials":
                if not data["username"]:
                    msg = "Account Type Tenable.sc Credentials is selected but Username is not provided!"
                    raise Exception(msg)
                elif not data["password"]:
                    msg = "Account Type Tenable.sc Credentials is selected but Password is not provided!"
                    raise Exception(msg)
            else:
                if not data["certificate_path"]:
                    msg = "Account Type Tenable.sc Certificate is selected but Certificate Path is not provided!"
                    raise Exception(msg)
                elif not data["key_file_path"]:
                    msg = "Account Type Tenable.sc Certificate is selected but Key File Path is not provided!"
                    raise Exception(msg)
        except Exception as exc:
            self.put_msg(exc)
            return False
        else:
            return True


class Credentials(Validator):
    def __init__(self, *args, **kwargs):
        """

        :param validator: user-defined validating function
        """
        super(Credentials, self).__init__()
        self._args = args
        self._kwargs = kwargs
        self.path = os.path.abspath(__file__)
        self.util = Utility()

    def validate(self, value, data):
        if data["tenable_account_type"] == "tenable_securitycenter_credentials":
            try:
                # Check uniqueness
                app_name = self.path.split(
                    '/')[-3] if '/' in self.path else self.path.split('\\')[-3]
                msg = self.util.check_uniqueness_of_account(
                    os.path.dirname(self.path).split('bin')[0],
                    app_name,
                    data['name'],
                    data["tenable_account_type"],
                    data["address"],
                    data["username"],
                    data["certificate_path"],
                    data["access_key"]
                )
                if msg:
                    raise Exception(msg)

                try:
                    tsc = TSC(
                        data["address"].strip('/'),
                        ssl_verify=is_true(data["verify_ssl"]),
                        proxies=self.util.get_proxy(data),
                        vendor='Tenable',
                        product='SplunkTA',
                        build=get_app_version(app_name)
                    )
                    tsc.login(data["username"], data["password"])
                    sc_version = tsc.system.details().get('version')
                except:
                    msg = "Please enter valid Address, Username and Password or configure valid proxy settings or verify SSL certificate."
                    raise Exception(msg)
                else:
                    if LooseVersion(sc_version) < LooseVersion('5.7.0'):
                        raise Exception("Please upgrade SC version to 5.7.0 or above")
                finally:
                    try:
                        tsc.logout()
                    except:
                        pass
            except Exception as exc:
                self.put_msg(exc)
                return False
            else:
                data["access_key"] = ''
                data["secret_key"] = ''
                data["certificate_path"] = ''
                data["key_file_path"] = ''
                data["key_password"] = ''
                return True
        else:
            return True


class Certificate(Validator):
    def __init__(self, *args, **kwargs):
        """

        :param validator: user-defined validating function
        """
        super(Certificate, self).__init__()
        self._args = args
        self._kwargs = kwargs
        self.path = os.path.abspath(__file__)
        self.util = Utility()

    def validate(self, value, data):
        if data["tenable_account_type"] == "tenable_securitycenter_certificate":
            try:
                # Checking Uniqueness
                app_name = self.path.split('/')[-3] if '/' in self.path else self.path.split('\\')[-3]
                msg = self.util.check_uniqueness_of_account(
                    os.path.dirname(self.path).split('bin')[0],
                    app_name,
                    data['name'],
                    data["tenable_account_type"],
                    data["address"],
                    data["username"],
                    data["certificate_path"],
                    data["access_key"]
                )
                if msg:
                    raise Exception(msg)

                base_path = self.path.split(app_name)[0]
                cert_base_path = base_path + app_name + "/certs/"
                certificate_path_list = data["certificate_path"].split(
                    '/') if '/' in data["certificate_path"] else data["certificate_path"].split('\\')
                certificate_path = key_file_path = cert_base_path
                for path in certificate_path_list:
                    certificate_path = os.path.join(certificate_path, path)
                if not os.path.exists(certificate_path):
                    msg = "Certificate Path: {} not found.".format(
                        certificate_path)
                    raise Exception(msg)

                key_path_list = data["key_file_path"].split(
                    '/') if '/' in data["key_file_path"] else data["key_file_path"].split('\\')
                for path in key_path_list:
                    key_file_path = os.path.join(key_file_path, path)
                if not os.path.exists(key_file_path):
                    msg = "Key File Path: {} not found.".format(key_file_path)
                    raise Exception(msg)

                cert_key_password = data.get('key_password', '')

                try:
                    address = data["address"].strip('/')
                    adapter = CustomHTTPAdapter(certfile=certificate_path, keyfile=key_file_path, password=cert_key_password)
                    tsc = TSC(address, ssl_verify=is_true(data["verify_ssl"]), proxies=self.util.get_proxy(data), adapter=adapter)
                    tsc.scans.list()
                except SSLError:
                    msg = "Please provide valid Certificate file, Key file or Key Password."
                    raise Exception(msg)
                except:
                    msg = "Please enter valid Address, configure valid proxy settings or verify SSL certificate."
                    raise Exception(msg)
            except Exception as exc:
                self.put_msg(exc)
                return False
            else:
                data["access_key"] = ''
                data["secret_key"] = ''
                data["username"] = ''
                data["password"] = ''
                return True
        else:
            return True


class TenableIO(Validator):
    def __init__(self, *args, **kwargs):
        """

        :param validator: user-defined validating function
        """
        super(TenableIO, self).__init__()
        self._args = args
        self._kwargs = kwargs
        self.path = os.path.abspath(__file__)
        self.util = Utility()

    def validate(self, value, data):
        if data["tenable_account_type"] == "tenable_io":
            try:
                app_name = self.path.split(
                    '/')[-3] if '/' in self.path else self.path.split('\\')[-3]
                msg = self.util.check_uniqueness_of_account(os.path.dirname(self.path).split('bin')[
                                                            0], app_name, data['name'], data["tenable_account_type"], data["address"], data["username"], data["certificate_path"], data["access_key"])
                if msg:
                    raise Exception(msg)

                try:
                    tio = TIO(
                        access_key=data["access_key"],
                        secret_key=data["secret_key"],
                        url="https://" + data["address"].strip('/'),
                        proxies=self.util.get_proxy(data),
                        vendor='Tenable',
                        product='SplunkTA',
                        build=get_app_version(app_name)
                    )
                    tio.scans.list()
                except:
                    msg = "Please enter valid Address, Access key and Secret key or configure valid proxy settings or verify SSL certificate."
                    raise Exception(msg)

            except Exception as exc:
                self.put_msg(exc)
                return False
            else:
                data["username"] = ''
                data["password"] = ''
                data["certificate_path"] = ''
                data["key_file_path"] = ''
                data["key_password"] = ''
                return True
        else:
            return True
