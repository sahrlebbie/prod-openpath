from tenable_validations import *
from sc_collector import SCCollector

import splunk.entity as entity
import tenable_utility as utility

from tenable.sc import TenableSC as TSC
from custom_http_adapter import CustomHTTPAdapter


def validate_input(helper, definition):
    '''
    Validates the input parameters and provides error to user on UI if the validation fails.
    :param helper: object of BaseModInput class
    :param definition: object containing input parameters
    '''

    session_key = definition.metadata["session_key"]
    app_name = helper.get_app_name()
    global_account_name = definition.parameters.get('global_account')
    query_name = definition.parameters.get('query_name')

    account_conf, account_stanza = utility.get_account_data(
        global_account_name, app_name)
    tenable_account_type = account_stanza.get("tenable_account_type")
    if tenable_account_type not in [
            "tenable_securitycenter_credentials",
            "tenable_securitycenter_certificate"
    ]:
        raise ValueError("Please select the correct account.")

    input_parser_obj, input_stanzas = utility.get_configuration(
        app_name, "inputs.conf")
    verify_ssl_certificate = utility.is_true(account_stanza["verify_ssl"])
    validate_sc_interval(helper, definition.parameters.get("interval"))

    entities = entity.getEntities(['admin', 'passwords'],
                                  namespace=app_name,
                                  owner='nobody',
                                  sessionKey=session_key,
                                  search=app_name)
    proxies = utility.get_proxy_settings(
        global_account_name=global_account_name,
        app=app_name,
        entities=entities)

    if tenable_account_type == "tenable_securitycenter_credentials":
        username = account_stanza["username"]
        password = utility.get_password(account_stanza["tenable_account_type"],
                                        entities, global_account_name)
        tsc = TSC(account_stanza["address"].strip('/'),
                  ssl_verify=verify_ssl_certificate,
                  proxies=proxies)
        tsc.login(username, password)
    else:
        certificate_path, key_file_path = utility.get_certificate_path(
            app_name, account_stanza["certificate_path"],
            account_stanza["key_file_path"])
        password = utility.get_password(account_stanza["tenable_account_type"], entities, global_account_name)
        adapter = CustomHTTPAdapter(certfile=certificate_path, keyfile=key_file_path, password=password)
        tsc = TSC(account_stanza["address"].strip('/'), ssl_verify=verify_ssl_certificate, proxies=proxies, adapter=adapter)

    validate_sc_query_name(helper, query_name, tsc)

    tsc.logout()


def collect_events(helper, ew):
    '''
    Collect data by making REST call to Tenable.sc.
    :param helper: object of BaseModInput class
    :param ew: object of EventWriter class
    '''
    ingester = SCCollector(helper, ew, analysis_type="sc_mobile")
    ingester.collect_events()
