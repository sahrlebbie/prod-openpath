
import ta_tenable_declare
from splunk_aoblib.rest_migration import ConfigMigrationHandler
from splunktaucclib.rest_handler import admin_external, util
from splunktaucclib.rest_handler.endpoint import (DataInputModel, RestModel,
                                                  field, validator)

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
            max_len=80,
            min_len=1,
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
        'lowest_severity_to_store',
        required=True,
        encrypted=False,
        default='info',
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
        'tags',
        required=False,
        encrypted=False,
        default=None,
        validator=None
    ),
    field.RestField(
        'max_event_size',
        required=False,
        encrypted=False,
        default=67108864,
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
    'tenable_io',
    model,
)


if __name__ == '__main__':
    admin_external.handle(
        endpoint,
        handler=ConfigMigrationHandler,
    )
