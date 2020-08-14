# Copyright 2016 Splunk, Inc.
#
# Licensed under the Apache License, Version 2.0 (the 'License'): you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.


from __future__ import absolute_import

import sys

import requests
sys.modules['%s.requests' % __name__] = requests

import splunklib
sys.modules['%s.splunklib' % __name__] = splunklib

import sortedcontainers
sys.modules['%s.sortedcontainers' % __name__] = sortedcontainers

import schematics
sys.modules['%s.schematics' % __name__] = schematics

try:
    if sys.version_info[0] == 2:
        from . import simpleyamlpy2 as simpleyaml
    else:
        from . import simpleyamlpy3 as simpleyaml
except ImportError:
    import simpleyaml

    sys.modules['%s.yaml' % __name__] = simpleyaml