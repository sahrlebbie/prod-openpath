
import ta_tenable_declare
from tenable_account_validation import *

from splunktaucclib.rest_handler.endpoint import (
    field,
    validator,
    RestModel,
    SingleModel,
)
from splunktaucclib.rest_handler import admin_external, util
from splunk_aoblib.rest_migration import ConfigMigrationHandler

util.remove_http_proxy_env_vars()


class AccountModel(SingleModel):
    def validate(self, name, data, existing=None):
        data_to_validate = data.copy()
        data_to_validate['name'] = name
        super(AccountModel, self).validate(name, data_to_validate, existing)


fields = [
    field.RestField(
        'tenable_account_type',
        required=True,
        encrypted=False,
        default='tenale_io',
        validator=TenableAccountType()
    ), 
    field.RestField(
        'address',
        required=True,
        encrypted=False,
        default=None,
        validator=Address()
    ),
    field.RestField(
        'verify_ssl',
        required=False,
        encrypted=False,
        default=True,
        validator=None
    ),
     field.RestField(
        'access_key',
        required=False,
        encrypted=True,
        default=None,
        validator=validator.String(
            min_len=1, 
            max_len=8192,
        )
    ), 
    field.RestField(
        'secret_key',
        required=False,
        encrypted=True,
        default=None,
        validator=TenableIO()
    ),
    field.RestField(
        'username',
        required=False,
        encrypted=False,
        default=None,
        validator=validator.String(
            min_len=1, 
            max_len=200,
        )
    ), 
    field.RestField(
        'password',
        required=False,
        encrypted=True,
        default=None,
        validator=Credentials()
    ),
    field.RestField(
        'certificate_path',
        required=False,
        encrypted=False,
        default=None,
        validator=validator.String(
            min_len=1, 
            max_len=500, 
        )
    ),
    field.RestField(
        'key_file_path',
        required=False,
        encrypted=False,
        default=None,
        validator=Certificate()
    ),
    field.RestField(
        'key_password',
        required=False,
        encrypted=True,
        default=None,
        validator=None
    ),
    field.RestField(
        'proxy_enabled',
        required=False,
        encrypted=False,
        default=None,
        validator=Proxy()
    ),
    field.RestField(
        'proxy_type',
        required=False,
        encrypted=False,
        default='http',
        validator=None
    ),
    field.RestField(
        'proxy_url',
        required=False,
        encrypted=False,
        default=None,
        validator=validator.String(
            max_len=4096,
            min_len=0,
        )
    ),
    field.RestField(
        'proxy_port',
        required=False,
        encrypted=False,
        default=None,
        validator=validator.Number(
            max_val=65535,
            min_val=1,
        )
    ),
    field.RestField(
        'proxy_username',
        required=False,
        encrypted=False,
        default=None,
        validator=validator.String(
            max_len=50,
            min_len=0,
        )
    ),
    field.RestField(
        'proxy_password',
        required=False,
        encrypted=True,
        default=None,
        validator=validator.String(
            max_len=8192,
            min_len=0,
        )
    )
]
model = RestModel(fields, name=None)


endpoint = AccountModel(
    'ta_tenable_account',
    model,
)

if __name__ == '__main__':
    admin_external.handle(
        endpoint,
        handler=ConfigMigrationHandler,
    )
