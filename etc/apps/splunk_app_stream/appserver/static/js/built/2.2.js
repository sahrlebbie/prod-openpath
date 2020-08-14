webpackJsonp([2],{"splunkjs/mvc/debugger":function(a,b,c){var d;d=function(a,b,d){var e=c("require/underscore"),f=c("require/backbone"),g=c("splunkjs/mvc/basemanager"),h=c("splunkjs/mvc/basesplunkview"),i=c("splunkjs/mvc/basetokenmodel"),j=c("splunkjs/mvc/searchmodel"),k=window.console,l=function(a){for(var b="",c=0;c<a;c++)b+="    ";return b},m=function(a){return"WARNING: "+a},n={MANAGER:"manager",VIEW:"view",NAMESPACE:"namespace",UNKNOWN:"unknown"},o=f.Model.extend({ready:!1,initialize:function(){var a=this;return a.registry=a.get("registry"),a.registry?void k.log("The Splunkjs debugger is running. For help, enter 'splunkjs.mvc.Debugger.help()'"):void k.log("splunk.mvc debugging interface could not find the registry")},isReady:function(){return this.ready},getDebugData:function(){var a=this,b=[],c=a.registry.getInstanceNames();e.each(c,function(c){var d=a.registry.getInstance(c),f=a._getComponentType(d),g=a._getComponentCategory(d),h=[],i={id:c,category:g,type:f,warnings:[]};if(g===n.VIEW){var j=null,k={};h=a._getValidViewOptions(d),d.settings&&(j=d.settings.get("managerid")||null,k=e.clone(d.settings.attributes),e.each(e.keys(k),function(a){if(!e.contains(h,a)){var b=a.split(".")[0];"mapping"!==b&&"charting"!==b&&i.warnings.push(m(a+" is not a recognized setting."))}})),i.managerid=j,i.settings=k,i.el=d.el||"no element set"}if(g===n.NAMESPACE&&(i.tokens=[],e.each(d.attributes,function(a,b){var c={name:b,value:a,listenerIds:[]};i.tokens.push(c)})),g===n.MANAGER){if(h=a._getValidManagerOptions(d),d.attributes){var l=e.clone(d.attributes);e.each(e.keys(l),function(a){e.contains(h,a)||i.warnings.push(m(a+" is not a recognized attribute"))})}i.attributes=d.attributes,i.query=d.query,i.search=d.search}g!==n.NAMESPACE&&(i.bindings=a._getComponentBindings(c)),b.push(i)});var d=e.where(b,{category:n.MANAGER}),f=e.where(b,{category:n.VIEW}),g=e.where(b,{category:n.NAMESPACE});return e.each(d,function(a){a.viewIds=e.pluck(e.where(f,{managerid:a.id}),"id"),a.viewIds.length<1&&a.warnings.push(m("no views bound to search manager."))}),e.each(f,function(a){a.managerid&&(e.contains(e.pluck(d,"id"),a.managerid)||a.warnings.push(m(a.managerid+" is not a registered manager.")))}),e.each(g,function(a){e.each(a.tokens,function(b){var c=e.filter(e.union(d,f),function(c){return e.some(c.bindings,function(c){if(c&&c.observes&&c.observes.length>0)return e.some(c.observes,function(c){return c.namespace===a.id&&c.name===b.name})})});b.listenerIds=e.pluck(c,"id")})}),b},_getValidViewOptions:function(a){var b=["id","name","managerid","manager","app","el","data"];return a.constructor.prototype.options&&(b=e.union(b,e.keys(a.constructor.prototype.options))),b},_getValidManagerOptions:function(a){var b=e.union(["app","id","owner","name","data"],e.keys(a.constructor.prototype.defaults)||[],j.SearchSettingsModel.ALLOWED_ATTRIBUTES);return b},_getComponentType:function(a){var b="Unknown type";if(a.moduleId){var c=a.moduleId.split("/").pop();c.length>0&&(b=c)}return b},_getComponentCategory:function(a){var b=n.UNKNOWN;return a instanceof h?b=n.VIEW:a instanceof g?b=n.MANAGER:a instanceof i&&(b=n.NAMESPACE),b},_getComponentTokenBoundProperties:function(a){var b=[],c=this._getComponentBindings(a);return b=e.keys(c)},_getComponentBindings:function(a){var b=this.registry.getInstance(a),c={};return b&&b.settings&&(c=e.extend(c,e.clone(b.settings._bindings))),c},createError:function(a){return a},printViewInfo:function(){var a=this,b=a.getInfoForViews();k.log("Views:"),e.each(b,function(a){k.log(l(1)+"ID: "+a.id),k.log(l(2)+"Type: "+a.type),k.log(l(2)+"Manager: "+a.managerid),k.log(l(2)+"Element: ",a.el),k.log(l(2)+"Settings: "),e.each(e.keys(a.settings),function(b){var c="",d=a.bindings[b],e=d&&d.observes&&d.observes.length>0;if(e){var f=JSON.stringify(d.template),g=JSON.stringify(d.computeValue(!0));c=" [bound: "+f+", resolved: "+g+"]"}k.log(l(3)+b+": "+JSON.stringify(a.settings[b])+c)}),a.warnings.length>0&&(k.log(l(2)+"WARNINGS: "),e.each(a.warnings,function(a){k.log(l(3)+a)}))})},printSearchManagerInfo:function(){var a=this,b=a.getInfoForManagers();k.log("Search Managers:"),e.each(b,function(a){if(k.log(l(1)+"ID: "+a.id),k.log(l(2)+"Type: "+a.type),a.attributes){k.log(l(2)+"Attributes: ");var b=j.SearchSettingsModel.ALLOWED_ATTRIBUTES;e.each(a.attributes,function(a,c){e.contains(b,c)||k.log(l(3)+c+": "+JSON.stringify(a))})}a.settings&&a.settings.attributes&&(k.log(l(2)+"Search Properties: "),e.each(a.settings.attributes,function(b,c){var d="",e=a.bindings[c],f=e&&e.observes&&e.observes.length>0;if(f){var g=JSON.stringify(e.template),h=JSON.stringify(e.computeValue(!0));d=" [bound: "+g+", resolved: "+h+"]"}k.log(l(3)+c+": "+JSON.stringify(b)+d)})),k.log(l(2)+"Views bound to manager: "),e.each(a.viewIds,function(a){k.log(l(3)+a)}),a.warnings.length>0&&(k.log(l(2)+"WARNINGS: "),e.each(a.warnings,function(a){k.log(l(3)+a)}))})},printTokenNamespaceInfo:function(){var a=this,b=a.getInfoForNamespaces();k.log("Token Namespaces:"),e.each(b,function(a){k.log(l(1)+"ID: "+a.id),k.log(l(2)+"Type: "+a.type),k.log(l(2)+"Tokens: "),e.each(a.tokens,function(a){k.log(l(3)+a.name+": "),k.log(l(4)+"value: "+JSON.stringify(a.value)),k.log(l(4)+"listeners: "+a.listenerIds.join(", "))})})},printComponentInfo:function(){this.printViewInfo(),this.printSearchManagerInfo(),this.printTokenNamespaceInfo()},printWarnings:function(){var a=this,b=a.getDebugData();k.log("WARNINGS:"),e.each(b,function(a){a.warnings.length>0&&(k.log(l(1),"ID: "+a.id+": "),e.each(a.warnings,function(a){k.log(l(2)+a)}))})},_getInfoForComponents:function(a){var b=this.getDebugData();return void 0!==a?e.where(b,{category:n[a]}):b},getInfoForViews:function(){return this._getInfoForComponents("VIEW")},getInfoForManagers:function(){return this._getInfoForComponents("MANAGER")},getInfoForNamespaces:function(){return this._getInfoForComponents("NAMESPACE")},help:function(){k.log("Splunkjs Debugger Commands"),k.log(l(1)+"- printWarnings(): Prints all warnings to the console."),k.log(l(1)+"- printComponentInfo(): Prints all debug info and warnings to the console by component."),k.log(l(1)+"- printViewInfo(): Prints debug info for all Splunk views."),k.log(l(1)+"- printSearchManagerInfo(): Prints debug info for all Splunk search managers."),k.log(l(1)+"- printTokenNamespaceInfo(): Prints debug info for Splunk token namespaces."),k.log(l(1)+"- getDebugData(): Returns all debug metadata for components and namespaces."),k.log(l(1)+"- getInfoForViews(): Returns debug metadata for all Splunk views."),k.log(l(1)+"- getInfoForManagers(): Returns debug metadata for all Splunk managers."),k.log(l(1)+"- getInfoForNamespaces(): Returns debug metadata for all Splunk token namespaces.")}});return o}.call(b,c,b,a),!(void 0!==d&&(a.exports=d))}});
//# sourceMappingURL=2.2.js.map