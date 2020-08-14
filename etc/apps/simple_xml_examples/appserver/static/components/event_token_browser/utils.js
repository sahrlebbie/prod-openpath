define(function () {
    function filterActionHistory(actionCollection, actionConfigs) {
        return  actionCollection.filter(function(actionModel) {
            var actionName = actionModel.actionName;
            return actionConfigs.get(actionName) === true;
        })
    }

    return {
        filterActionHistory: filterActionHistory
    };
});