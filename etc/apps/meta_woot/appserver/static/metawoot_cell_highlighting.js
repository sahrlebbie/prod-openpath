
 require([
     'underscore',
     'jquery',
     'splunkjs/mvc',
     'splunkjs/mvc/tableview',
     'splunkjs/mvc/simplexml/ready!'
     ],
 function(_, $, mvc, TableView) {
  // Create Table IDs. These IDs will need to be used in Splunk when editing the XML.
     var tableids = ["shading"];
     var tableidlength=tableids.length;
     var Cellvaluerenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
           return true;
        },
        render: function($td, cell) { 
		
		// Assign classes to differnet values. In this case, the "Critical" class is assigned to any cell with a value of "High" for the "Latency Level" field in Splunk.

           var value = cell.value;
            if (cell.field == 'Latency Level') {
              if (value=='High') {
                 $td.addClass('Critical');
              }
              if (value=='Medium') {
                 $td.addClass('Medium');
              }
              if (value=='Low') {
                 $td.addClass('Normal');
              }
           }
           if (cell.field == 'Index Level') {
              if (value=='Late') {
                 $td.addClass('Critical');
              }
              if (value=='Delayed') {
                 $td.addClass('Medium');
              }
              if (value=='Recent') {
                 $td.addClass('Normal');
              }
            }
           $td.text(value);
        }
     });

     for (var i = 0; i < tableidlength; i++) {

       if (mvc.Components.get(tableids[i])){
          mvc.Components.get(tableids[i]).getVisualization(function(tableView) {
             tableView.table.addCellRenderer(new Cellvaluerenderer());
             tableView.table.render();
         });
       }
     }
 });
