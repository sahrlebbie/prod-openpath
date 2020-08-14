/**
 * @author atruong
 * @date 6/23/15
 *
 * DMC alerts manager page
 */
 define([
 	'underscore',
 	'module',
 	'views/Base',
 	'views/shared/CollectionPaginator',
    'views/shared/dataenrichment/preview/components/SelectPageCount',
    'views/shared/CollectionCount',
    'views/shared/controls/SyntheticSelectControl',
    'views/shared/controls/TextControl',
    'contrib/text!splunk_monitoring_console/views/settings/dmc_alerts_setup/enterprise/Master.html',
    'splunk_monitoring_console/views/settings/dmc_alerts_setup/enterprise/Grid',
    'uri/route'

 ], function(
 	_,
 	module,
 	BaseView,
 	CollectionPaginatorView,
 	SelectPageCountView,
 	CollectionCountView,
 	SyntheticSelectControlView,
 	TextControlView,
 	template,
 	GridView,
 	route
 ){
 	return BaseView.extend({
 		moduleId: module.id,
 		template: template,

 		initialize: function(options) {
 			BaseView.prototype.initialize.call(this, options);

 			this.children.gridView = new GridView({
 				model: {serverInfo: this.model.serverInfo},
                collection: { alerts: this.collection.alerts, alertConfigs: this.collection.alertConfigs }
 			});

			this.children.textNameFilter = new TextControlView({
				model: this.collection.alerts.fetchData,
				modelAttribute: 'searchFilter', 
				inputClassName: 'search-query',
				canClear: true,
				placeholder: _('filter').t()
			});

			this.children.collectionPaginatorView = new CollectionPaginatorView({
				collection: this.collection.alerts,
				model: this.collection.alerts.fetchData
			});

			this.children.selectPageCountView = new SyntheticSelectControlView({
                modelAttribute: 'count',
                model: this.collection.alerts.fetchData,
                items: [
                    { value: '10', label: _('10 Per Page').t() },
                    { value: '25', label: _('25 Per Page').t() },
					{ value: '50', label: _('50 Per Page').t() },
					{ value: '100', label: _('25 Per Page').t() }
                ],
                save: false,
                elastic: true,
                menuWidth: 'narrow',
                className: 'btn-group pull-left',
                toggleClassName: 'btn-pill'
            });

			this.children.collectionCountView = new CollectionCountView({
				collection: this.collection.alerts,
				countLabel: _('Alerts').t()
			});

 		},

 		render: function() {
 			var docUrl = route.docHelp(
 				this.model.application.get('root'),
 				this.model.application.get('locale'),
 				'app.splunk_monitoring_console.enable_alerts');

 			var html = this.compiledTemplate({
 				docUrl: docUrl
 			});

 			this.$el.html(html);

 			if (this.children.gridView) {
 				this.children.gridView.detach();
            }

 			if (this.children.textNameFilter) {
 				this.children.textNameFilter.detach();
            }

 			if (this.children.collectionCountView) {
 				this.children.collectionCountView.detach();
            }

 			if (this.children.collectionPaginatorView) {
 				this.children.collectionPaginatorView.detach();
            }

 			if (this.children.selectPageCountView) {
 				this.children.selectPageCountView.detach();
            }

 			this.children.gridView.render().appendTo(this.$('.grid-placeholder'));
 			this.children.textNameFilter.render().appendTo(this.$('.text-name-filter-placeholder'));
 			this.children.collectionPaginatorView.render().appendTo(this.$('.paginator-container'));
            this.children.collectionCountView.render().appendTo(this.$('.collection-count'));
            this.children.selectPageCountView.render().appendTo(this.$('.select-page-count'));

 			return this;
 		}
 	});
 });