define([
  'underscore',
  'backbone',
  './utils'
], function (
  _,
  Backbone,
  utils
) {
    return Backbone.View.extend({
        initialize: function() {
            this.listenTo(this.collection.actions, 'add', this.renderWithoutArgs);
            this.listenTo(this.model.actionConfigs, 'change', this.renderWithoutArgs);
        },

        renderWithoutArgs: function() {
            return this.render();
        },

        render: function(model) {
            this.$el.html(this.template);

            var tbody = this.$('tbody');

            var actionCollection = utils.filterActionHistory(this.collection.actions, this.model.actionConfigs);

            // always select the first model to render if there's no selected model.
            var actionModel = model || actionCollection[0];
            if (!actionModel) {
                // no data to render
                return this;
            }

            _(actionModel.attributes).each(function(value, token) {
                var tr = $('<tr></tr>');
                $('<td class="token-name"></td>').text('$' + token + '$').appendTo(tr);
                $('<td class="token-value"></td>').text(value).appendTo(tr);
                tr.appendTo(tbody);
            });

            return this;
        },

        template:
        '<h4>Tokens</h4>' +
        '<div class="token-view-table-container">' +
            '<table class="table table-chrome">' +
                '<thead>' +
                    '<tr>' +
                        '<th>Token</th>' +
                        '<th>Value</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody></tbody>' +
            '</table>' +
        '</div>'
    });
});