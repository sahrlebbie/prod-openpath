import ta_tenable_declare

import os
import sys
import time
import datetime
import json

import modinput_wrapper.base_modinput
from solnlib.packages.splunklib import modularinput as smi



import input_module_tenable_io as input_module

bin_dir = os.path.basename(__file__)

'''
    Do not edit this file!!!
    This file is generated by Add-on builder automatically.
    Add your modular input logic to file input_module_tenable_io.py
'''
class ModInputTenableIO(modinput_wrapper.base_modinput.BaseModInput):

    def __init__(self):
        if 'use_single_instance_mode' in dir(input_module):
            use_single_instance = input_module.use_single_instance_mode()
        else:
            use_single_instance = False
        super(ModInputTenableIO, self).__init__("ta_tenable", "tenable_io", use_single_instance)
        self.global_checkbox_fields = None

    def get_scheme(self):
        """overloaded splunklib modularinput method"""
        scheme = super(ModInputTenableIO, self).get_scheme()
        scheme.title = ("Tenable.io")
        scheme.description = ("Go to the add-on\'s configuration UI and configure modular inputs under the Inputs menu.")
        scheme.use_external_validation = True
        scheme.streaming_mode_xml = True

        scheme.add_argument(smi.Argument("name", title="Name",
                                         description="",
                                         required_on_create=True))

        """
        For customized inputs, hard code the arguments here to hide argument detail from users.
        For other input types, arguments should be get from input_module. Defining new input types could be easier.
        """
        scheme.add_argument(smi.Argument("global_account", title="Global Account",
                                         description="",
                                         required_on_create=True,
                                         required_on_edit=False))
        scheme.add_argument(smi.Argument("start_time", title="Start Time",
                                         description="The date (UTC in \"YYYY-MM-DDThh:mm:ssZ\" format) from when to start collecting the data. Default value taken will be start of epoch time.",
                                         required_on_create=False,
                                         required_on_edit=False))
        scheme.add_argument(smi.Argument("lowest_severity_to_store", title="Lowest Severity to Store",
                                         description="",
                                         required_on_create=True,
                                         required_on_edit=False))
        scheme.add_argument(smi.Argument("sync_plugins", title="Sync Plugin Details",
                                         description="Sync plugin details via this input?",
                                         required_on_create=False,
                                         required_on_edit=False))
        scheme.add_argument(smi.Argument("fixed_vulnerability", title="Historical Fixed Vulnerability",
                                         description="Historical fixed vulnerability via this input?",
                                         required_on_create=False,
                                         required_on_edit=False))
        scheme.add_argument(smi.Argument("tags", title="Tags",
                                         description="Parameter tags should be of {\"tag_key1\": [\"tag_value1\", \"tag_value2\"...], \"tag_key2\": ...} OR [(\"key1\": [\"value1\", \"value2\",...]), (\"key2\": ...)] format.",
                                         required_on_create=False,
                                         required_on_edit=False))
        scheme.add_argument(smi.Argument("max_event_size", title="Max Event Size",
                                         description="Maximum allowed size of an event",
                                         required_on_create=False,
                                         required_on_edit=False))
        return scheme

    def get_app_name(self):
        return "TA-tenable"

    def validate_input(self, definition):
        """validate the input stanza"""
        input_module.validate_input(self, definition)

    def collect_events(self, ew):
        """write out the events"""
        input_module.collect_events(self, ew)

    def get_account_fields(self):
        account_fields = []
        return account_fields

    def get_checkbox_fields(self):
        checkbox_fields = []
        checkbox_fields.append("verify_ssl_certificate")
        return checkbox_fields

    def get_global_checkbox_fields(self):
        if self.global_checkbox_fields is None:
            checkbox_name_file = os.path.join(bin_dir, 'global_checkbox_param.json')
            try:
                if os.path.isfile(checkbox_name_file):
                    with open(checkbox_name_file, 'r') as fp:
                        self.global_checkbox_fields = json.load(fp)
                else:
                    self.global_checkbox_fields = []
            except Exception as e:
                self.log_error('Get exception when loading global checkbox parameter names. ' + str(e))
                self.global_checkbox_fields = []
        return self.global_checkbox_fields

if __name__ == "__main__":
    exitcode = ModInputTenableIO().run(sys.argv)
    sys.exit(exitcode)
