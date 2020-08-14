import re
import six
import json
import time
import datetime
import calendar
import croniter
from six.moves.configparser import NoOptionError
from tenable_utility import is_true

try:
    basestring
except NameError:
    basestring = str


# common field validations for IO and SC
def get_interval(interval):
    """Converts cron schedule or string interval to integer interval.
    
    Args:
        interval (string): cron string or seconds
    
    Returns:
        int: interval between modinput invocations in seconds
    """
    try:
        return int(interval)
    except:
        now = datetime.datetime.now()
        cron = croniter.croniter(interval, now)
        first_invocation = cron.get_next(datetime.datetime)
        second_invocation = cron.get_next(datetime.datetime)
        return int((second_invocation - first_invocation).total_seconds())


def validate_start_time(helper, start_time):
    if not start_time:
        return

    if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", start_time):
        helper.log_error("Validation Error: Start Time should be in YYYY-MM-DDThh:mm:ssZ format.")
        raise ValueError(
            "Start Time should be in YYYY-MM-DDThh:mm:ssZ format.")

    time_pattern = "%Y-%m-%dT%H:%M:%SZ"
    start_time = calendar.timegm(time.strptime(start_time, time_pattern))

    if start_time < 0:
        helper.log_error("Validation Error: Start Time can not be before 1970-01-01T00:00:00Z.")
        raise ValueError("Start Time can not be before 1970-01-01T00:00:00Z.")
    elif start_time >= int(time.time()):
        helper.log_error("Validation Error: Start Time can not be in the future.")
        raise ValueError("Start Time can not be in the future.")


def validate_lowest_severity(helper, lowest_severity):
    if not isinstance(lowest_severity, str):
        helper.log_error("Validation Error: Lowest Severity should be of string or unicode type.")
        raise TypeError("Lowest Severity should be of string or unicode type.")

    if lowest_severity not in ("info", "low", "medium", "high", "critical"):
        helper.log_error("Validation Error: Lowest Severity should be from info, low, medium, high, or critical list.")
        raise ValueError(
            "Lowest Severity should be from info, low, medium, high, or critical list."
        )


def validate_fixed_vulnerability(helper, fixed_vulnerability):
    if fixed_vulnerability not in ("1", "0"):
        helper.log_error("Validation Error: Fixed vulnerability should be either 0 or 1.")
        raise ValueError("Fixed vulnerability should be either 0 or 1.")


def validate_max_event_size(helper, max_event_size):
    if not max_event_size:
        return

    try:
        int(max_event_size)
    except:
        helper.log_error("Validation Error: Max Event Size must be a positive integer.")
        raise ValueError("Max Event Size must be a positive integer.")

    # minimum character size for UTF-8
    if int(max_event_size) < 4:
        helper.log_error("Validation Error: Max Event Size should be greater than or equal to 4 bytes.")
        raise ValueError(
            "Max Event Size should be greater than or equal to 4 bytes.")


def validate_io_interval(helper, interval):
    interval = get_interval(interval)
    if interval > 86400 or interval < 3600:
        helper.log_error('Validation Error: Interval should be between 3600 and 86400 seconds both included.')
        raise ValueError(
            'Interval should be between 3600 and 86400 seconds both included.')


def validate_tags(helper, tags):
    if not tags:
        return

    format_msg = 'Accepted tag formats are {"tag_key1": ["tag_value1", "tag_value2"...], "tag_key2": ...} OR [("key1", "value1"), ("key2", "value2"), ...]'
    # legacy format for tags input
    try:
        tags_json = json.loads(tags)
        err = 'Key-Values in {"tag_key1": ["tag_value1", "tag_value2"...], "tag_key2": ...} should be of string or unicode type.'
        for key, values in tags_json.items():
            if not isinstance(key, basestring):
                helper.log_error("Validation Error: " + err)
                raise TypeError(err)
            if isinstance(values, list):
                for val in values:
                    if not isinstance(val, basestring):
                        helper.log_error("Validation Error: " + err)
                        raise TypeError(err)
            elif not isinstance(values, basestring):
                helper.log_error("Validation Error: " + err)
                raise TypeError(err)

    # newer format of tags from tenable v3.0
    except ValueError:
        try:
            tags_list = eval(tags, {"__builtins__": None}, {})
        except Exception as e:
            helper.log_error("Invalid format Error: {}".format(str(e)))
            raise Exception("Invalid format Error: {}".format(format_msg))
        err = "Tags should be a list of (\"key\", \"value\") pairs."
        if not isinstance(tags_list, list):
            helper.log_error("Validation Error: " + err)
            raise TypeError(err)

        err += " Key-Value pairs are tuples (\"key\", \"value\") and are case-sensitive."
        for item in tags_list:
            if not isinstance(item, tuple):
                helper.log_error("Validation Error: " + err)
                raise TypeError(err)
            if not isinstance(item[1], basestring):
                helper.log_error("Validation Error: " + err)
                raise TypeError(
                    err +
                    " Value Key-Value pairs is either of type string/unicode type."
                )
    # when unexpected error occures it will prints the traceback in the UI and we want to avoid that
    except Exception as e:
        helper.log_error("Invalid format Error: {}".format(str(e)))
        raise Exception("Invalid format Error: {}".format(str(e)))


def validate_sc_interval(helper, interval):
    interval = get_interval(interval)

    if interval < 300:
        helper.log_error('Validation Error: Interval should be greater than or equal to 300 seconds.')
        raise ValueError(
            'Interval should be greater than or equal to 300 seconds.')


def validate_sync_plugins(helper, sync_plugins, stanza_name, account_conf, account_stanza,
                             input_parser_obj, input_stanzas, name):
    flag = 0
    for stanza in input_stanzas:
        try:
            if stanza.startswith(stanza_name) and name != stanza.split(
                    '://')[1] and account_stanza["address"] == account_conf.get(
                        input_parser_obj.get(stanza, 'global_account'), 'address'
                    ) and int(input_parser_obj.get(stanza, 'sync_plugins')) and (
                        not input_parser_obj.has_option(stanza, 'disabled')
                        or not int(input_parser_obj.get(stanza, 'disabled'))):
                input_name = stanza.split('://')[1]
                flag = 1
        except NoOptionError:
            # this exception is passed silently to handle upgrade scenario as sync plugins is added later on
            pass
    if is_true(sync_plugins) and flag:
        msg = "Sync Plugin Details is already configured in {} input with same SecurityCenter. Please un-check Sync Plugin Details from here.".format(
            input_name)
        helper.log_error("Validation Error: " + msg)
        raise Exception(msg)
    if not is_true(sync_plugins) and not flag:
        msg = "Please check Sync Plugin Details field"
        helper.log_error("Validation Error: " + msg)
        raise Exception(msg)


def validate_sc_query_name(helper, query_name, tsc):
    if not query_name:
        return
    found_query = False
    query_info = None
    found_query_with_other_tool = False
    for query in tsc.queries.list(['id', 'name', 'filters', 'tool']).get('usable'):
        if query["name"] == query_name and query["tool"] == "vulndetails":
            if found_query:
                msg = "Multiple query IDs found with given query name " + \
                    str(query_name)
                helper.log_error("Validation Error: " + msg)
                raise Exception(msg)
            else:
                query_info = query
                found_query = True
        elif query["name"] == query_name and query["tool"] != "vulndetails":
            found_query_with_other_tool = True

    if not query_info and found_query_with_other_tool:
        msg = "Provided query must be for a Vulnerability Detail List tool"
        helper.log_error("Validation Error: " + msg)
        raise Exception(msg)

    if not query_info:
        msg = "Query with the name " + str(query_name) + " does not exist."
        helper.log_error("Validation Error: " + msg)
        raise Exception(msg)