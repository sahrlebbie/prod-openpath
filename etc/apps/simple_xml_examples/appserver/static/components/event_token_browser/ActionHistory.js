define([
  'backbone',
  './ActionItem',
  './utils'
], function (
  Backbone,
  ActionItem,
  utils
) {
    return Backbone.View.extend({
        initialize: function() {
            this.listenTo(this.collection.actions, 'add', this.render);

            this.listenTo(this.model.actionConfigs, 'change', this.render);
        },

        render: function() {
            var actionCollection = utils.filterActionHistory(this.collection.actions, this.model.actionConfigs);
            this.$el.html(this.template);
            this.$('tbody').html(actionCollection.map(function(actionModel) {
                var actionView = new ActionItem({
                    model: {
                        actionModel: actionModel,
                        controller: this.model.controller
                    }
                });

                return actionView.render().$el;
            }.bind(this)));
            this.$('tbody tr:first').addClass('active');

            return this;
        },

        template:
        '<h4>Event History</h4>' +
        '<div class="token-view-table-container">' +
            '<table class="table table-hover table-chrome">' +
                '<thead>' +
                    '<tr>' +
                        '<th>Event</th>' +
                        '<th>Component</th>' +
                        '<th>Time</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody></tbody>' +
            '</table>' +
        '</div>'
    });
});