import aws_bootstrap_env
import splunk.admin as admin

from splunktalib.rest_manager import multimodel

import aws_settings_base_rh


class ConfigRuleLogging(aws_settings_base_rh.AWSLogging):
    keyMap = {
        'level': 'log_level'
    }


class ConfigRuleSettings(multimodel.MultiModel):
    endpoint = "configs/conf-aws_config_rule"
    modelMap = {
        'logging': ConfigRuleLogging,
    }


if __name__ == "__main__":
    admin.init(multimodel.ResourceHandler(ConfigRuleSettings), admin.CONTEXT_APP_AND_USER)
