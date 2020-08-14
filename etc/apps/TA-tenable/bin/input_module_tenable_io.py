from tenable_validations import *
from io_collector import IOCollector

from tenable_utility import get_account_data, get_configuration


def validate_input(helper, definition):
    '''
    Validates the input parameters and provides error to user on UI if the validation fails.
    :param helper: object of BaseModInput class
    :param definition: object containing input parameters
    '''
    app_name = helper.get_app_name()
    name = definition.metadata['name']
    sync_plugins = definition.parameters.get('sync_plugins')
    global_account_name = definition.parameters.get('global_account')

    account_conf, account_stanza = get_account_data(global_account_name,
                                                    app_name)
    tenable_account_type = account_stanza.get("tenable_account_type")
    if tenable_account_type != "tenable_io":
        raise ValueError("Please select the correct account.")

    validate_io_interval(helper, definition.parameters.get("interval"))
    validate_start_time(helper, definition.parameters.get("start_time"))
    validate_lowest_severity(
        helper, definition.parameters.get("lowest_severity_to_store"))

    input_parser_obj, input_stanzas = get_configuration(
        app_name, "inputs.conf")
    validate_sync_plugins(helper, sync_plugins, "tenable_io://", account_conf,
                          account_stanza, input_parser_obj, input_stanzas,
                          name)
    validate_fixed_vulnerability(
        helper, definition.parameters.get("fixed_vulnerability"))
    validate_tags(helper, definition.parameters.get("tags"))
    max_event_size = definition.parameters.get("max_event_size")
    validate_max_event_size(helper, max_event_size)


def collect_events(helper, ew):
    '''
    Collect data by making REST call to Tenable.io.
    :param helper: object of BaseModInput class
    :param ew: object of EventWriter class
    '''

    ingester = IOCollector(helper, ew)
    ingester.collect_events()
