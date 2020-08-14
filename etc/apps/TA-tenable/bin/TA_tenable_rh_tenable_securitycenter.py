
import ta_tenable_declare

from splunktaucclib.rest_handler.endpoint import (
    field,
    validator,
    RestModel,
    DataInputModel,
)
from splunktaucclib.rest_handler import admin_external, util
from splunk_aoblib.rest_migration import ConfigMigrationHandler

util.remove_http_proxy_env_vars()


fields = [
    field.RestField(
        'interval',
        required=True,
        encrypted=False,
        default=None,
        validator=None
    ),
    field.RestField(
        'index',
        required=True,
        encrypted=False,
        default='default',
        validator=validator.String(
            min_len=1,
            max_len=80,
        )
    ),
    field.RestField(
        'global_account',
        required=True,
        encrypted=False,
        default=None,
        validator=None
    ),
    field.RestField(
        'start_time',
        required=False,
        encrypted=False,
        default=None,
        validator=None
    ),
    field.RestField(
        'sync_plugins',
        required=False,
        encrypted=False,
        default=None,
        validator=None
    ),
    field.RestField(
        'fixed_vulnerability',
        required=False,
        encrypted=False,
        default=None,
        validator=None
    ),
    field.RestField(
        'query_name',
        required=False,
        encrypted=False,
        default=None,
        validator=validator.String(
            min_len=1,
            max_len=8192,
        )
    ),
    field.RestField(
        'max_event_size',
        required=False,
        encrypted=False,
        default=67108864,
        validator=None
    ),
    field.RestField(
        'page_size',
        required=False,
        encrypted=False,
        default=1000,
        validator=None
    ),
    field.RestField(
        'disabled',
        required=False,
        validator=None
    )

]
model = RestModel(fields, name=None)


endpoint = DataInputModel(
    'tenable_securitycenter',
    model,
)


if __name__ == '__main__':
    admin_external.handle(
        endpoint,
        handler=ConfigMigrationHandler,
    )
