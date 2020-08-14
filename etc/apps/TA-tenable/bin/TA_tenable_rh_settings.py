
import ta_tenable_declare

from splunktaucclib.rest_handler.endpoint import (
    field,
    validator,
    RestModel,
    MultipleModel,
)
from splunktaucclib.rest_handler import admin_external, util
from splunk_aoblib.rest_migration import ConfigMigrationHandler

util.remove_http_proxy_env_vars()


fields_logging = [
    field.RestField(
        'loglevel',
        required=False,
        encrypted=False,
        default='INFO',
        validator=None
    )
]
model_logging = RestModel(fields_logging, name='logging')


fields_ar_configuration = [
    field.RestField(
        'ar_index',
        required=True,
        encrypted=False,
        default='default',
        validator=None
    )
]
model_ar_configuration = RestModel(fields_ar_configuration, name='ar_configuration')


endpoint = MultipleModel(
    'ta_tenable_settings',
    models=[
        model_logging,
        model_ar_configuration
    ],
)


if __name__ == '__main__':
    admin_external.handle(
        endpoint,
        handler=ConfigMigrationHandler,
    )
