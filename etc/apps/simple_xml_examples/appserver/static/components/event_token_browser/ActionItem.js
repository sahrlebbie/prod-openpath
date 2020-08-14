define([
  'backbone'
], function (
  Backbone
) {
    return Backbone.View.extend({
        tagName: 'tr',

        events: {
            'click': function(e) {
                e.preventDefault();
                this.$el.addClass('active');
                this.$el.siblings().removeClass('active');
                this.model.controller.trigger('showTokens', this.model.actionModel);
            },

            'mouseover': function() {
                this.model.controller.trigger('highlight', this.model.actionModel.componentId);
            },

            'mouseout': function() {
                this.model.controller.trigger('lowlight', this.model.actionModel.componentId);
            }
        },

        render: function() {
            this.$el.html(
              '<td class="action-name">' + this.model.actionModel.actionName + '</td>' +
              '<td>' + this.model.actionModel.componentId + '</td>' +
              '<td>' + this.model.actionModel.time + '</td>'
            );

            return this;
        }
    });
});