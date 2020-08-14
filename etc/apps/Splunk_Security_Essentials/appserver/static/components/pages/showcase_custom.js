"use strict";


/* This ultimately belongs in a separate file...*/
require(['jquery', 'splunkjs/mvc/simplexml/controller', 'components/controls/Modal'], function($, DashboardController, Modal) {

        var triggerModal = function(bodycontent) {
            var myModal = new Modal('MyModalID-irrelevant-unless-you-want-many', {
                title: 'Find Out More',
                destroyOnHide: true,
                type: 'wide'
            });

            $(myModal.$el).on("hide", function() {
                // Not taking any action on hide, but you can if you want to!
            })

            myModal.body.addClass('mlts-modal-form-inline')
                .append($(bodycontent));

            myModal.footer.append($('<button>').addClass('mlts-modal-submit').attr({
                type: 'button',
                'data-dismiss': 'modal'
            }).addClass('btn btn-primary mlts-modal-submit').text('Close').on('click', function() {
                // Not taking any action on Close... but I could!        
            }))
            myModal.show(); // Launch it!
        }
        window.triggerModal = triggerModal

    })
    /* END This ultimately belongs in a separate file...*/































require(["jquery",
        "underscore",
        "splunkjs/mvc",
        "splunkjs/mvc/chartview",
        "splunkjs/mvc/dropdownview",
        "splunkjs/mvc/textinputview",
        "splunkjs/mvc/singleview",
        "splunkjs/mvc/checkboxview",
        "splunkjs/mvc/tableview",
        "splunkjs/mvc/utils",
        'splunkjs/mvc/visualizationregistry',
        'Options',
        "components/splunk/AlertModal",
        "components/splunk/Forms",
        "components/splunk/KVStore",
        'components/splunk/SearchBarWrapper',
        "components/splunk/Searches",
        "components/data/parameters/ParseSearchParameters",
        "components/data/formatters/compactTemplateString",
        "components/data/serializers/ShowcaseHistorySerializer",
        "components/controls/AssistantControlsFooter",
        "components/controls/AssistantPanel/Master",
        "components/controls/QueryHistoryTable",
        "components/controls/SearchStringDisplay",
        "components/controls/DrilldownLinker",
        "components/controls/Messages",
        "components/controls/Modal",
        "components/controls/Spinners",
        "components/controls/Tabs",
        "components/controls/ProcessSummaryUI",
        "components/data/sampleSearches/SampleSearchLoader",
        "components/data/validators/NumberValidator",
        "splunkjs/mvc/searchmanager",
        'json!' + $C['SPLUNKD_PATH'] + '/services/SSEShowcaseInfo?locale=' + window.localeString,
        'bootstrap.tooltip',
        'bootstrap.popover'
    ],
    function($,
        _,
        mvc,
        ChartView,
        DropdownView,
        TextInputView,
        SingleView,
        CheckboxView,
        TableView,
        utils,
        VisualizationRegistry,
        Options,
        AlertModal,
        Forms,
        KVStore,
        SearchBarWrapper,
        Searches,
        ParseSearchParameters,
        compact,
        ShowcaseHistorySerializer,
        AssistantControlsFooter,
        AssistantPanel,
        QueryHistoryTable,
        SearchStringDisplay,
        DrilldownLinker,
        Messages,
        Modal,
        Spinners,
        Tabs,
        ProcessSummaryUI,
        SampleSearchLoader,
        NumberValidator,
        SearchManager,
        ShowcaseInfo
    ) {
        var showcaseName = 'showcase_custom';
        var appName = Options.getOptionByName('appName');
        var ShowcaseId = "";
        if(location.href.indexOf("?showcaseId=")>=0){
            var hash = location.href.split("?")[1];
            var params = {}
            hash.split('&').map(hk => {
                let temp = hk.split('=');
                params[temp[0]] = temp[1]
            });
            if(params["showcaseId"]){
                ShowcaseId = params["showcaseId"]
            }
        }
        ProcessSummaryUI.process_chosen_summary(ShowcaseInfo['summaries'][ShowcaseId], "", ShowcaseInfo, ShowcaseId)

        if ($(".dvTooltip").length > 0) { $(".dvTooltip").tooltip() }
        if ($(".dvPopover").length > 0) { $(".dvPopover").popover() }
        $("#ReminderToSubmit").html("(Click <i>" + $("#submitControl").html() + "</i> above to find outliers.)")
        $("#assistantControlsFooter button:contains(Open in Search)").hide()
        $("#assistantControlsFooter button:contains(Line-by-Line SPL Documentation)").hide()
            // disable the form on initial load

    });