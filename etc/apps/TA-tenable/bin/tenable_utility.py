import io
import os
import re
import json
import requests
import datetime
import croniter
import six.moves.configparser
import time
import calendar
from math import ceil

import splunk.rest as rest
from splunk.clilib.bundle_paths import make_splunkhome_path


def get_app_version(my_app):
    config, stanza = get_configuration(my_app, 'app.conf', folder='default')
    return '{}-b{}'.format(
        config.get('launcher', 'version'),
        config.get('install', 'build')
    )

def get_configuration(my_app, file, folder="local"):
    conf_parser = six.moves.configparser.ConfigParser()
    conf = os.path.join(make_splunkhome_path(
        ["etc", "apps", my_app, folder, file]))
    stanzas = []
    if os.path.isfile(conf):
        with io.open(conf, 'r', encoding='utf_8_sig') as conffp:
            conf_parser.readfp(conffp)
        stanzas = conf_parser.sections()
    return conf_parser, stanzas


def get_certificate_path(my_app, cert_path, key_path):
    base_path = os.path.join(make_splunkhome_path(
        ["etc", "apps", my_app, "certs"]))
    certificate_path_list = cert_path.split(
        '/') if '/' in cert_path else cert_path.split('\\')
    certificate_path = base_path
    for path in certificate_path_list:
        certificate_path = os.path.join(certificate_path, path)
    if not os.path.exists(certificate_path):
        msg = "Certificate Path: {} not found.".format(certificate_path)
        raise Exception(msg)

    key_path_list = key_path.split(
        '/') if '/' in key_path else key_path.split('\\')
    key_file_path = base_path
    for path in key_path_list:
        key_file_path = os.path.join(key_file_path, path)
    if not os.path.exists(key_file_path):
        msg = "Key File Path: {} not found.".format(key_file_path)
        raise Exception(msg)

    return certificate_path, key_file_path


def get_password(tenable_app, entities, name):
    '''
    Give password
    :param entities: dict which will have clear password
    :param name: name of modular input
    :return: password and certificate key password
    '''
    password = ''
    for _, value in entities.items():
        if value['username'].partition('`')[0] == str(name) and not value.get('clear_password', '`').startswith('`'):
            cred = json.loads(value.get('clear_password', '{}'))
            password = cred.get('password', '') if tenable_app == 'tenable_securitycenter_credentials' else cred.get(
                'key_password', '')
            break
    return password


def is_true(val):

    value = str(val).strip().upper()
    if value in ("1", "TRUE", "T", "Y", "YES"):
        return True
    return False


def create_uri(proxy_enabled, global_account_dict):

    uri = None
    if is_true(proxy_enabled) and global_account_dict.get('proxy_url') and global_account_dict.get('proxy_type'):
        uri = global_account_dict['proxy_url']
        if global_account_dict.get('proxy_port'):
            uri = '{}:{}'.format(uri, global_account_dict.get('proxy_port'))
        if global_account_dict.get('proxy_username') and global_account_dict.get('proxy_password'):
            uri = '{}://{}:{}@{}/'.format(global_account_dict['proxy_type'],
                                          global_account_dict['proxy_username'], global_account_dict['proxy_password'], uri)
        else:
            uri = '{}://{}'.format(global_account_dict['proxy_type'], uri)
    return uri


def get_proxy_settings(global_account_dict=None, global_account_name=None, app=None, entities=None):
    '''
    Give proxy uri
    :param global_account_dict: global account dictionary
    :param global_account_name: global account name
    :param app: name of app
    :param entities: dict which will have clear password
    :return: proxy settings
    '''
    proxies = {}
    if global_account_name and app and not global_account_dict:
        _, global_account_dict = get_account_data(global_account_name, app)

    if not global_account_dict:
        return proxies

    if global_account_dict.get('proxy_username') and entities:
        for _, value in entities.items():
            if value['username'].partition('`')[0] == global_account_name and not value.get('clear_password', '`').startswith('`'):
                cred = json.loads(value.get('clear_password', '{}'))
                global_account_dict['proxy_password'] = cred.get(
                    'proxy_password', '')
                break

    proxy_enabled = global_account_dict.get('proxy_enabled')

    uri = create_uri(proxy_enabled, global_account_dict)

    if uri:
        proxies = {
            'http': uri,
            'https': uri
        }
    return proxies


def set_proxy_attributes(account_config, account_dict, stanza):

    if account_config.has_option(stanza, "proxy_enabled"):
        account_dict["proxy_enabled"] = account_config.get(
            stanza, 'proxy_enabled')
    if account_config.has_option(stanza, "proxy_type"):
        account_dict["proxy_type"] = account_config.get(stanza, 'proxy_type')
    if account_config.has_option(stanza, "proxy_url"):
        account_dict["proxy_url"] = account_config.get(stanza, 'proxy_url')
    if account_config.has_option(stanza, "proxy_port"):
        account_dict["proxy_port"] = account_config.get(stanza, 'proxy_port')
    if account_config.has_option(stanza, "proxy_username"):
        account_dict["proxy_username"] = account_config.get(
            stanza, 'proxy_username')


def get_account_data(global_account, my_app):

    account_config, account_stanzas = get_configuration(
        my_app, "ta_tenable_account.conf")
    account_dict = {}

    for stanza in account_stanzas:
        if str(stanza) == global_account:
            account_dict["address"] = account_config.get(stanza, 'address')
            account_dict["verify_ssl"] = account_config.get(
                stanza, 'verify_ssl')
            account_dict["tenable_account_type"] = account_config.get(
                stanza, 'tenable_account_type')

            set_proxy_attributes(account_config, account_dict, stanza)

            if account_dict["tenable_account_type"] == "tenable_securitycenter_credentials":
                account_dict["username"] = account_config.get(
                    stanza, 'username')
            elif account_dict["tenable_account_type"] == "tenable_securitycenter_certificate":
                account_dict["certificate_path"] = account_config.get(
                    stanza, 'certificate_path')
                account_dict["key_file_path"] = account_config.get(
                    stanza, 'key_file_path')

    return account_config, account_dict


def get_kvstore_status(session_key):
    _, content = rest.simpleRequest("/services/kvstore/status", sessionKey=session_key,
                                    method="GET", getargs={"output_mode": "json"}, raiseAllErrors=True)
    data = json.loads(content)['entry']
    return data[0]["content"]["current"].get("status")


def check_kvstore_status(session_key):
    status = get_kvstore_status(session_key)
    count = 0
    while status != 'ready':
        if status == 'starting':
            count += 1
            if count < 3:
                time.sleep(30)
                status = get_kvstore_status(session_key)
                continue
        raise Exception(
            "KV store is not in ready state. Current state: " + str(status))
