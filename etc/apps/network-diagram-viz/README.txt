Version Support
7.2, 7.1, 7.0, 6.6, 6.5, 6.4, 6.3, 6.2, 6.1, 6.0

Who is this app for?
This app is for dashboard designers who want to display how different entities are related to eachother on a dashboard panel.


How does the app work?
This app provides a visualization that you can use in your own apps and dashboards.

To use it in your dashboards, simply install the app, and create a search that provides the values you want to display.


Usecases for the Network Diagram Visualization:
Displaying current server status based on CPU, Memory, I/O, and Disk usage
Visually associating users with actions, e.g. purchases, crashes, errors
Visualising the connection speeds between two hosts or services
Showing how events are related to eachother

The following fields can be used in the search:
from (required): The unique name of the source entity.
to (optional): The unique name of the destination entity.
value (optional): Text to display as a tool tip. This text is also available as a token when the entity (from) is clicked.
type (optional): This is used to display the entity on the dashboard (from). Use the list of icons available, Splunk server icons, or shapes.
color (optional): Used to set the color of the text and icon (except for Splunk icons).
linktext (optional): Text to display on the link between the from and to entities.
Options can be overwritten, so if type or color is set multiple times in the search results, the last value will be used. This is useful if you wish to set the icon types and values via a lookup table at the end of your search.


Example Search
| makeresults count=12
| streamstats count as id 
| eval from=case(id=1,"Load Balancer",id=2,"Load Balancer",id=3,"Load Balancer", id=4,"Web 1",id=5,"Web 1", id=6, "Web 2",id=7,"Web 2", id=8,"Web 3",id=9,"Web 3",id=10,"App Server 1",id=11,"App Server 2",id=12, "Database Server") 
| eval to=case(id=1,"Web 1",id=2,"Web 2",id=3,"Web 3", id=4,"App Server 1",id=5,"App Server 2", id=6, "App Server 1",id=7,"App Server 2", id=8,"App Server 1",id=9,"App Server 2",id=10,"Database Server",id=11,"Database Server",id=12, "") 
| eval value=case(id=1,"Load Balancer",id=2,"Load Balancer",id=3,"Load Balancer", id=4,"Web 1",id=5,"Web 1", id=6, "Web 2",id=7,"Web 2", id=8,"Web 3",id=9,"Web 3",id=10,"App Server 1",id=11,"App Server 2",id=12, "Database Server") 
| eval type=case(id=1,"sitemap",id=4,"server", id=6, "server",id=8,"server",id=10,"server",id=11,"server",id=12, "database") 
| fields from, to, value, type


Tokens
Tokens are generated each time you click a node. This can be useful if you want to populate another panel on the dashboard with a custom search, or link to a new dashboard with the tokens carying across.

Node: This is the unique node name (e.g. the server name). Default value: $nd_node_token$
Value: This is the value/tooltip as it was defined in the search results. Default value: $nd_value_token$

# Release Notes #
v 1.0.0
Initial version

Issues and Limitations
If you have a bug report or feature request, please contact daniel@spavin.net


Privacy and Legal
No personally identifiable information is logged or obtained in any way through this visualizaton.

For support
Send email to daniel@spavin.net

Support is not guaranteed and will be provided on a best effort basis.


3rd Party Libraries
This visualization uses the network module from visjs.org

Icons made by Smashicons from www.flaticon.com is licensed by CC 3.0 BY

Icons made by https://fontawesome.com