"""
Copyright (C) 2009-2020 Splunk Inc. All Rights Reserved.

Helper Functions to generate Dashboard Objects
"""

from spacebridgeapp.util.constants import SPACEBRIDGE_APP_NAME, NOBODY
from spacebridgeapp.data.dashboard_data import DashboardDescription
from spacebridgeapp.data.dashboard_data import DashboardDefinition
from spacebridgeapp.data.dashboard_data import DashboardRow
from spacebridgeapp.data.dashboard_data import DashboardPanel
from spacebridgeapp.data.dashboard_data import DashboardVisualization
from spacebridgeapp.data.dashboard_data import Search
from spacebridgeapp.dashboard.dashboard_helpers import generate_visualization_id
from spacebridgeapp.dashboard.dashboard_helpers import generate_dashboard_id
from splapp_protocol import common_pb2


def create_dashboard_description_table(owner=NOBODY,
                                       app_name='search',
                                       display_app_name='Search & Reporting',
                                       description='alert_message',
                                       visualization_title='alert_subject',
                                       query=''):
    dashboard_id = generate_dashboard_id(owner, app_name, 'generated_by_' + SPACEBRIDGE_APP_NAME)
    dashboard_title = 'Generated by ' + SPACEBRIDGE_APP_NAME
    visualization_id = generate_visualization_id(query=query)
    visualization_type = common_pb2.DashboardVisualization.DASHBOARD_VISUALIZATION_TABLE

    # TODO: Just example table options, better defaults?
    options_map = {
        'wrap': 'true',
        'totalRows': 'false',
        'rowNumbers': 'false',
        'percentagesRow': 'false',
        'drilldown': 'none',
        'dataOverlayModel': 'none',
        'count': '20'}

    # Create Search
    search = Search(query=query)

    # Create Visualization
    list_visualizations = [DashboardVisualization(visualization_id=visualization_id,
                                                  title=visualization_title,
                                                  search=search,
                                                  visualization_type=visualization_type,
                                                  options_map=options_map)]

    # Create Panel
    list_panels = [DashboardPanel(list_dashboard_visualizations=list_visualizations)]

    # Create Row
    list_rows = [DashboardRow(list_dashboard_panels=list_panels)]

    # Create Definition
    definition = DashboardDefinition(dashboard_id=dashboard_id,
                                     title=dashboard_title,
                                     description=description,
                                     list_rows=list_rows)

    return DashboardDescription(dashboard_id=dashboard_id,
                                title=dashboard_title,
                                description=description,
                                app_name=app_name,
                                display_app_name=display_app_name,
                                definition=definition)
