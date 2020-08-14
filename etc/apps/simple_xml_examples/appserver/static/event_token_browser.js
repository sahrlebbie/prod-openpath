/* TODO: jink to replace theme_utils with that from core */
require.config({
  paths: {
    theme_utils: '../app/simple_xml_examples/theme_utils'
  }
});

require([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/checkboxgroupview',
    'splunkjs/mvc/basemanager',
    'splunkjs/mvc/simplexml/searcheventhandler',
    '../app/simple_xml_examples/components/event_token_browser/ActionHistory',
    '../app/simple_xml_examples/components/event_token_browser/TokenDetail',
    'backbone',
    'util/moment',
    'theme_utils',
    'css!../app/simple_xml_examples/event_token_browser.css',
    'splunkjs/mvc/simplexml/ready!'
    ],
function(
    $,
    _,
    mvc,
    CheckboxGroupView,
    BaseManager,
    SearchEventHandler,
    ActionHistoryView,
    TokenDetailView,
    Backbone,
    moment,
    themeUtils
){
    function getSearchManagerComponents(components) {
        return _(components).filter(function(component) {
            return component instanceof BaseManager;
        });
    }

    var DASHBOARD_ACTIONS = {
        valueChange: {
            getComponents: function(components) {
                return _(components).filter(function(component) {
                    return component._isDashboardInput;
                });
            },
            filterDefault: true,
            actionType: 'input'
        },
        drilldown: {
            getComponents: function(components) {
                return _(components).filter(function(component) {
                    return component._isDashboardElement;
                });
            },
            filterDefault: true,
            actionType: 'element'
        },
        selection: {
            getComponents: function(components) {
                return _(components).filter(function(component) {
                    return component._isDashboardElement;
                });
            },
            filterDefault: true,
            actionType: 'element'
        },
        'progress': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        },
        'preview': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        },
        'done': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        },
        'finalized': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        },
        'cancelled': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        },
        'error': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        },
        'fail': {
            getComponents: getSearchManagerComponents,
            filterDefault: false,
            actionType: 'search'
        }
    };

    var DASHBOARD_ACTION_NAMES = _(DASHBOARD_ACTIONS).keys();
    var DASHBOARD_ACTION_NAMES_BY_TYPE = _(DASHBOARD_ACTION_NAMES).groupBy(function(action) {
        return DASHBOARD_ACTIONS[action].actionType;
    });

    var isDarkTheme = themeUtils.getCurrentTheme && themeUtils.getCurrentTheme() === 'dark';

    var TokenView = Backbone.View.extend({
        className: isDarkTheme ? 'token-view dark':'token-view',

        initialize: function() {
            this.model = {
                actionConfigs: new Backbone.Model(),
                controller: new Backbone.View()
            };

            this.collection = {
                actions: new Backbone.Collection()
            };
            
            this.children = {};

            _(DASHBOARD_ACTION_NAMES).each(function(action) {
                this.model.actionConfigs.set(action, DASHBOARD_ACTIONS[action].filterDefault);
                this.listenToUserAction(action);
            }, this);

            _(DASHBOARD_ACTION_NAMES_BY_TYPE).each(function(actions, type) {
                var viewName = type + 'actionFilterView';

                this.children[viewName] = new CheckboxGroupView({
                    choices: _(actions).map(function(action) {
                        return {label: action, value: action};
                    }),
                    'default': _(actions).filter(function(action) {
                        return DASHBOARD_ACTIONS[action].filterDefault;
                    }).map(function(action) {
                        return action;
                    })
                });

                this.listenTo(this.children[viewName], 'change', function(selectedActions) {
                    this.updateActionConfigs(this.children[type + 'actionFilterView'], selectedActions);
                });
            }, this);

            this.listenTo(this.model.controller, 'all', this.handleControllerEvent);


            // TODO: this logic should be implemented in simplexml/splunkjs instead of here
            // trigger SimpleXML search events: http://docs.splunk.com/Documentation/Splunk/6.4.2/Viz/tokens#Define_search_tokens
            _(mvc.Components.attributes).each(function(component) {
                if (component instanceof BaseManager) {
                    this.listenTo(component, 'search:progress', function emitProgressAndPreviewEvents(e) {
                        component.trigger('progress', SearchEventHandler.prototype.createEventData('progress', e));

                        var previewEventSettings = SearchEventHandler.events['preview'];
                        var previewCtx = {
                            _data: component.data(previewEventSettings.data, previewEventSettings.fetchOptions)
                        };
                        this.listenTo(previewCtx._data, 'data nodata', function() {
                            component.trigger('preview', SearchEventHandler.prototype.createEventData.call(previewCtx, 'preview', e));
                            this.stopListening(previewCtx._data, 'data nodata');
                        });
                    });

                    this.listenTo(component, 'search:done', function emitDoneAndFinalizedEvents(e) {
                        component.trigger('done', SearchEventHandler.prototype.createEventData('done', e));

                        var finalizedEventSettings = SearchEventHandler.events['finalized'];
                        var finalizedCtx = {
                            _data: component.data(finalizedEventSettings.data, finalizedEventSettings.fetchOptions)
                        };
                        this.listenTo(finalizedCtx._data, 'data nodata', function() {
                            component.trigger('finalized', SearchEventHandler.prototype.createEventData.call(finalizedCtx, 'finalized', e));
                            this.stopListening(finalizedCtx._data, 'data nodata');
                        });
                    });

                    this.listenTo(component, 'search:error', function emitErrorEvent(e) {
                        component.trigger('error', e);
                    });

                    this.listenTo(component, 'search:failed', function emitFailEvent(e) {
                        component.trigger('fail', e);
                    });

                    this.listenTo(component, 'search:cancelled', function emitCancelledEvent(e) {
                        component.trigger('cancelled', e);
                    });
                }
            }, this);
        },

        updateActionConfigs: function(checkboxGroupView, selectedActions) {
            var allActions = _(checkboxGroupView.settings.get('choices')).map(function(action) {
                return action.value;
            });

            var unselectedActions = _(allActions).difference(selectedActions);
            _(unselectedActions).each(function(action) {
                this.model.actionConfigs.set(action, false);
            }, this);
            _(selectedActions).each(function(action) {
                this.model.actionConfigs.set(action, true);
            }, this)
        },

        handleControllerEvent: function(event, data) {
            switch (event) {
                case 'highlight':
                    this.highlightComponent(data);
                    break;
                case 'lowlight':
                    this.lowlightComponent(data);
                    break;
                case 'showTokens':
                    this.children.tokenDetail.render(data);
                    break;
                default:
                    console.error('unknown event:', event);
                    break;
            }
        },

        highlightComponent: function(componentId) {
            var component = mvc.Components.get(componentId);
            if (component.$el) {
                component.$el.css('outline', '5px solid red');
            }
        },

        lowlightComponent: function(componentId) {
            var component = mvc.Components.get(componentId);
            if (component.$el) {
                component.$el.css('outline', '');
            }
        },

        listenToUserAction: function(action) {
            var components = this.getComponentsByUserAction(action);

            _(components).each(function(component) {
                this.listenTo(component, action, this.getActionHandler(action, component.id));
            }, this);
        },

        getActionHandler: function(action, componentId) {
            return function actionHandler(e) {
                if (!e) {
                    return;
                }

                // ideally we should not prevent default. But, some actions (such as drilldown) will navigate to a
                // new page which makes this extension unusable, so we have to disable the default behavior.
                if (_.isFunction(e.preventDefault)) {
                    e.preventDefault();
                }
                this.addActionItem(e.data, action, componentId);
            }.bind(this);
        },

        stopListeningUserAction: function(action) {
            var components = this.getComponentsByUserAction(action);

            _(components).each(function(component) {
                this.stopListening(component, action);
            }, this);
        },

        getComponentsByUserAction: function(action) {
            return DASHBOARD_ACTIONS[action].getComponents(_(mvc.Components.attributes).values());
        },

        addActionItem: function(data, action, componentId) {
            var model = new Backbone.Model(data);
            model.time = moment().format('hh:mm:ss a');
            model.actionName = action;
            model.componentId = componentId;
            this.collection.actions.unshift(model);
        },

        render: function() {
            this.$el.html(this.template);

            // this.children.actionFilterView.render().$el.appendTo(this.$('.action-filter'));
            _(DASHBOARD_ACTION_NAMES_BY_TYPE).each(function(actions, type) {
                var viewName = type + 'actionFilterView';

                this.children[viewName].render().$el.appendTo(this.$('.' + type + '-action-filter'));
            }, this);

            this.children.actionHistory = new ActionHistoryView({
                model: {
                    controller: this.model.controller,
                    actionConfigs: this.model.actionConfigs
                },

                collection: {
                    actions: this.collection.actions
                }
            });

            this.children.tokenDetail = new TokenDetailView({
                model: {
                    actionConfigs: this.model.actionConfigs
                },
                collection: {
                    actions: this.collection.actions
                }
            });
            this.children.tokenDetail.render().$el.appendTo(this.$('.token-detail'))

            this.children.actionHistory.render().$el.appendTo(this.$('.action-history'));

            return this;
        },
        template: '<h3>Token Info</h3>' +
            '<div class="action-filter">' +
                _(DASHBOARD_ACTION_NAMES_BY_TYPE).map(function(_, type) {
                    return (
                        '<div class="action-filter-group ' + type + '-action-filter">' +
                            '<div class="action-filter-label">' + type + ' event filter' + '</div>' +
                        '</div>'
                    );
                }).join('') +
            '</div>' +
            '<div class="clearfix">' +
                '<div class="action-history"></div>' +
                '<div class="token-detail"></div>' +
            '</div>'
    });

    var tokenView = new TokenView();

    tokenView.render().$el.insertAfter($('.dashboard-body'));
});