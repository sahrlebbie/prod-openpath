var _ = require("underscore")
var dataProductStatusNames = {
    "needsConfirmation": _("Needs Confirmation").t(),
    "analyzing": _("Analyzing CIM and Event Size").t(),
    "analyzingtwo": _("Analyzing Volume and Hosts").t(),
    "complete": _("Complete").t(),
    "introspectionFailed": _("CIM and Event Size Introspection Failed").t(),
    "introspectionFailedTwo": _("Volume and Host Introspection Failed").t(),
    "nearFuture": _("Planned for the Near Future").t(),
    "manual": _("Data Present (exact location not provided)").t()
}
var stagesWithValidPendingStatus = {
    "step-eventsize": _("Analyzing CIM and Event Size").t(),
    "step-volume": _("Analyzing Volume and Hosts").t()
}

function grayoutAddProducts(duration){
    if(!duration){
        duration = 750 // Milliseconds
    }
    $(".container-for-add-product-table").prepend('<div class="add-product-gray-out" style="position: absolute; left: 0px; top:0px; width: 100%; height: 100%; background-color: rgba(255,255,255,0.7); z-index: 1000; text-align: center; padding-top: 50px"><img title="Running" src="' + Splunk.util.make_full_url('/static/app/Splunk_Security_Essentials/images/general_images/loader.gif') + '" style="width: 30px;"></div>')
    setTimeout(function(){
        $(".add-product-gray-out").remove()
    },duration)
}
window.grayoutAddProducts = grayoutAddProducts


function markNoProduct(){
    let eventtypeId = $(".ds_datasource_active").attr("id");
    let present = false
    let record = {}
    for(let i = 0; i < window.data_inventory_eventtypes.length; i++){
        if(window.data_inventory_eventtypes[i].eventtypeId == eventtypeId){
            updated = true;
            window.data_inventory_eventtypes[i].status = "manualnodata"
            record = window.data_inventory_eventtypes[i]
            
        }
    }
    if(!present){
        record = {
            "created_time": Math.round(Date.now() / 1000),
            "updated_time": Math.round(Date.now() / 1000),
            "eventtypeId": eventtypeId,
            "status": "manualnodata",
            "basesearch": "",
            "_key": eventtypeId
        }
        window.data_inventory_eventtypes.push(record)
    }
    notifyIntroElementsOfEventtypeChange(record)
        
    $.ajax({
        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes/?query={"_key": "' + eventtypeId + '"}',
        type: 'GET',
        contentType: "application/json",
        async: true,
        success: function(returneddata) {
             // console.log("Got a return from the data thing", returneddata)
            if (returneddata.length > 0) {
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes/' + eventtypeId,
                    type: 'POST',
                    contentType: "application/json",
                    async: true,
                    data: JSON.stringify(record),
                    success: function(returneddata) {bustCache(); newkey = returneddata },
                    error: function(xhr, textStatus, error) {
                        //              console.log("Error Updating!", xhr, textStatus, error)
                    }
                })
            }else{

                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_eventtypes/',
                    type: 'POST',
                    contentType: "application/json",
                    async: true,
                    data: JSON.stringify(record),
                    success: function(returneddata) {bustCache(); newkey = returneddata },
                    error: function(xhr, textStatus, error) {
                        //              console.log("Error Updating!", xhr, textStatus, error)
                    }
                })

            }
        },
        error: function(xhr, textStatus, error) {
            //              console.log("Error Updating!", xhr, textStatus, error)
        }
    })

    updateIconsAndCounts()
    toggleNoProducts(eventtypeId);
}


function createTable(eventtypeId){
    require(["underscore", 'json!' + $C['SPLUNKD_PATH'] + '/services/pullCSV?config=data-inventory-config'], function(_, data_inventory_config){
        if( $(".ds_main_panel").find("table.product-list").length == 0){
            let table = $('<table class="table product-list"><thead><tr><th><i class="icon-info" /></th><th>' + _('Vendor').t() + '</th><th>' + _('Product').t() + '</th><th>' + _('Status').t() + '</th><th>' + _('Coverage').t() + '</th><th>' + _('Base Search').t() + '</th><th>' + _('Actions').t() + '</th></tr></thead><tbody></tbody></table>')
            $(".ds_main_panel").append($('<div class="data-inventory-draw-container">').append($("<h3>" + _("Products for this Data Source Category").t() + "</h3>"), $('<div class="container-for-add-product-table" style="position: relative">').append(table), $('<div class="action_addproduct"><i class="icon-plus-circle"> ' + _('Add Product').t() + '</div>').css("cursor", "pointer").click(function(){ ExistingOrNewProductModal() /*addOrEditModal()*/ })))
            let doProductsExist = false
            for(let i = 0; i < window.data_inventory_products.length; i++){
                //  console.log("Evaluating Status", window.data_inventory_products[i].status, dataProductStatusNames, dataProductStatusNames[window.data_inventory_products[i].status])
                
                if(window.data_inventory_products[i].eventtypeId && window.data_inventory_products[i].eventtypeId.split("|").indexOf(eventtypeId) >= 0 && ! isProductFailed(window.data_inventory_products[i].productId) && ! isProductInQueue(window.data_inventory_products[i].productId)){
                    addRow(eventtypeId, window.data_inventory_products[i].productId, data_inventory_config)
                    doProductsExist = true
                }
            }
            if(! doProductsExist){
                let isManualNoData = false;
                for(let i = 0; i < window.data_inventory_eventtypes.length; i++){
                    if(window.data_inventory_eventtypes[i]['eventtypeId'] == eventtypeId && window.data_inventory_eventtypes[i]['status'] == "manualnodata"){
                        isManualNoData = true
                    }
                }
                if(! isManualNoData){

                    $(".ds_main_panel").append($('<div class="action_noproduct"><i class="icon-minus-circle"> ' + _('No Data Present').t() + '</div>').css("cursor", "pointer").click(function(){
                        markNoProduct() 
                       }))
                }
            }
        }

        toggleNoProducts(eventtypeId);
    })
}


require(["underscore", "jquery"], function(_, $){

    function generateSlider(currentScore){
        let SelectStatus = $('<div class="input_eventtype_status" id="input_eventtype_status"><br /><br /><button class="reset btn" type="btn">' + _("Reset").t() + '</button></div>')
        let textValue = ""
        if(currentScore){
            setTimeout(function(){
                setSliderStatus($("#myRange"))
                textValue = " value=\"" + currentScore + "\" "
            },100)

        }
        SelectStatus.prepend($('<div class="slidecontainer"></div>').append($('<div class="sliderDescription"><span style="float: left;">0%</span><span style="float: right;">100%</span><span class="statusPercent">' + _("How Is Your Coverage?").t() + '</span></div>'), $('<input type="range" min="1" data-placement="top" data-toggle="tooltip" max="100" value="' + currentScore + '" class="slider" id="myRange">').click(function(evt) {
            let target = $(evt.target);
            let newValue = target.val();
            setSliderStatus(target)

        }), $('<div class="sliderStatus">% Complete</div>').prepend($('<input id="slider-exact-number" ' + textValue + ' type="text" style="width: 40px;" default="100" />').on("keyup change", function(evt){
            if($(evt.target).val() && $(evt.target).val() != ""){
                $("#myRange").val($(evt.target).val())
                setSliderStatus($(".slider"))
            }
        }))))

        
        $(".input_eventtype_status").find("button.reset").click(function() {
                let newValue = "unknown";
                $(".slidecontainer").find("input").val(50);
                $(".slidecontainer").find("input").removeClass("selectedSlider");
                $(".slidecontainer").find("input").css("background-color", "#d3d3d3");
                $(".slidecontainer").find("#slider-exact-number").text("");
            })
        function setSliderStatus(target) {

            let value = target.val()
            let orig_value = value;
            if (value < 30) {
                value--;
            }
            let label = value + "% Complete"
            let starting_red = 183;
            let starting_green = 231;
            let starting_blue = 253;
            let final_red = 0;
            let final_green = 101;
            let final_blue = 173;
            let desired_red = (value / 100) * (final_red - starting_red) + starting_red;
            let desired_green = (value / 100) * (final_green - starting_green) + starting_green;
            let desired_blue = (value / 100) * (final_blue - starting_blue) + starting_blue;
            
            target.css("background-color", "rgb(" + desired_red + "," + desired_green + "," + desired_blue + ")")
            target.addClass("selectedSlider")
            if($("#slider-exact-number").val() != orig_value){
                $("#slider-exact-number").val(orig_value)
            }
            
        }
        return SelectStatus
    }
    window.generateSlider = generateSlider

})


function generateRow(product, data_inventory_config){
    let _ = require("underscore")
    let Modal = require("app/Splunk_Security_Essentials/components/controls/Modal")
        let productId = product.productId  
        let titleRow = $('<tr class="data-inventory-product"></tr>').attr("data-productid", productId).attr("data-product-json", JSON.stringify(product))
        let descriptionRow = $('<tr class="data-inventory-product-description" style="display: none;"><td class="main-description-container" colspan="7"><table class="table data-inventory-product-description-table"><thead><tr><th>' + _('# of Hosts').t() + '</th><th>' + _('Average Event Size').t() + '</th><th>' + _('Typical Events Per Day').t() + '</th><th>' + _('CIM Coverage').t() + '</th><th>' + _('TERM Search').t() + '</th></tr></thead><tbody><tr></tr></tbody></table></td></tr>').attr("data-productid", productId)

        let metadata_configured = {};
        if(product.metadata_json && product.metadata_json != "" && product.metadata_json.match(/^\{.*\}$/)){
            try{
                metadata_configured = JSON.parse(product.metadata_json)
                let div = $("<div>")
                for(metadata in metadata_configured){
                    let local_div = $("<div>").css("max-width", "500px").css("display", "inline-block")
                    let metadata_name = metadata;
                    for(let i = 0; i < data_inventory_config.length; i++){
                        if(metadata == data_inventory_config[i].field){
                            metadata_name = data_inventory_config[i].fieldName
                        }
                    }
                    local_div.append("<b>" + metadata_name + "</b>")
                    local_div.append("<p>" + metadata_configured[metadata] + "</p>")
                    div.append(local_div)
                }
                descriptionRow.find(".main-description-container").prepend(div)
            }
            catch(error){
                // 
            }
        }
        
        // Chevron
        titleRow.append($("<td>").append($('<a href="#"><i class="icon-chevron-right" /></a>').attr("data-productid", productId).click(function(evt){
            let target = $(evt.target);
            let icon = target.closest("td").find("i");
            let productId = target.closest("td").find("a").attr("data-productid");

            if(icon.attr("class").indexOf("-right") >= 0){ // Closed
                icon.removeClass("icon-chevron-right").addClass("icon-chevron-down");
                $("tr.data-inventory-product-description[data-productid=" + productId + "]").show()
            }else{
                icon.removeClass("icon-chevron-down").addClass("icon-chevron-right");
                $("tr.data-inventory-product-description[data-productid=" + productId + "]").hide()
            }
            return false;
        })))

        // Vendor
        let vendor = ""
        if(product.vendorName && product.vendorName!=null){
            vendor = product.vendorName;
        }
        titleRow.append("<td class=\"display-vendorName\">" + vendor + "</td>") 

        // Product
        let productname = ""
        if(product.productName && product.productName!=null){
            productname = product.productName;
        }
        titleRow.append("<td class=\"display-productName\">" + productname + "</td>") 

        // Status
        let status = ""
        if(product.status && product.status!=null){
            if(product.status == "pending" && stagesWithValidPendingStatus[product.stage]){
                status = stagesWithValidPendingStatus[product.stage]
            }else{ 
                status = dataProductStatusNames[product.status]; // Comes from localized CommonDataObjects.js
            }
        }
        titleRow.append("<td class=\"display-status\">" + status + "</td>")

        // Coverage Level
        let coverage = $("<td class=\"display-coverage\">");
        let sliderLevel = undefined;
        if(product['coverage_level'] && product['coverage_level']!=null && product['coverage_level']!="" && product['coverage_level']!= -1){
            coverage.append( $('<span class="data-inventory-product-coverage-level">').attr("data-productId", productId).append(product['coverage_level'] + "%&nbsp;"  ) )
            sliderLevel = product['coverage_level']
        }
        titleRow.append(coverage.append( $(' <a><i class="icon-pencil"/></a>').click(function(){
            let myBody = $('<div id="determine-coverage-slider">').append(generateSlider(sliderLevel));

            let myModal = new Modal("addCoverage", {
                title: _("Edit Coverage").t(),
                backdrop: 'static',
                keyboard: true,
                destroyOnHide: true,
                type: 'wide'
            });

            myModal.body.attr("data-productId", product['productId']).html(myBody)

            myModal.footer.append($('<button>').attr({
                type: 'button',
                'data-dismiss': 'modal'
            }).addClass('btn').text( _('Cancel').t() ).on('click', function(evt) {
                
            }), $('<button>').attr({
                type: 'button',
                'data-dismiss': 'modal'
            }).addClass('btn btn-primary').attr("data-productId", product['productId']).text( _('Save').t() ).on('click', function(evt) {
                let productId = $(evt.target).attr("data-productid")
                $(".data-inventory-product-coverage-level[data-productid=" + productId.replace(/([^a-zA-Z0-9\-_=\.\]\[])/g, "\\$1") + "]").text($("#slider-exact-number").val() + "% ")
                //console.log("Got it", $("#slider-exact-number").val(), $(evt.target).attr("data-productid"))
                for(let i = 0; i < window.data_inventory_products.length; i++){
                    if(window.data_inventory_products[i]['productId'] == productId){
                        if($("#slider-exact-number").val() && $("#slider-exact-number").val() != ""){
                            window.data_inventory_products[i]['coverage_level'] = $("#slider-exact-number").val();
                            notifyIntroElementsOfProductChange(window.data_inventory_products[i], true);
                        }
                    }
                }
                
            }))
            myModal.show(); // Launch it!
        }) ))
    
        

        // basesearch
        let basesearch = ""
        if(product.basesearch && product.basesearch!=null){
            basesearch = product.basesearch
        }
        titleRow.append("<td class=\"display-basesearch\">" + basesearch + "</td>")

        // Actions
        let actionText = $("<td>")
        actionText.append($("<div>").addClass("action_edit").html( _("Update").t() + "&nbsp;" ).append("<i class=\"icon-pencil\">").click(function(evt) {
            let content = JSON.parse($(evt.target).closest("tr").attr("data-product-json"))
            
            addOrEditModal(product)
            
        }))
        actionText.append($("<div>").addClass("action_clear").html( _("Delete").t() + "&nbsp;" ).append("<i class=\"icon-close\">").click(function(evt) {
            let productId = $(evt.target).closest("tr").attr("data-productid");
            window.cancelSearch(productId) // from data_inventory_introspection
            $("#introspectionStatus").find("tr[data-id=AWS__VPC_Flow_Logs]").remove()
            let eventtypeId = $(".ds_datasource_active").attr("id");
            removeRow(eventtypeId, productId);
            
        }))
        titleRow.append(actionText) 
        
        let descriptionBlock = descriptionRow.find("table.data-inventory-product-description-table").find("tbody").find("tr")
        if(product.daily_host_volume && product.daily_host_volume!="" && ! isNaN(product.daily_host_volume)){
            descriptionBlock.append('<td>' + (Math.round(product.daily_host_volume*100)/100 + " hosts" || "?") + '</td>') // Num Hosts
        }else{
            descriptionBlock.append('<td>N/A</td>')
        }
        if(product.eventsize && product.eventsize!="" && ! isNaN(product.eventsize)){
            descriptionBlock.append('<td>' + (Math.round(product.eventsize*100)/100 + " bytes"|| "?") + '</td>') // Average Event Size
        }else{
            descriptionBlock.append('<td>N/A</td>')
        }
        if(product.daily_event_volume && product.daily_event_volume!="" && ! isNaN(product.daily_event_volume)){
            descriptionBlock.append('<td>' + (Math.round(product.daily_event_volume*100)/100 + " events" || "?") + '</td>') // Num Events
        }else{
            descriptionBlock.append('<td>N/A</td>')
        }
        if(product.cim_compliant_fields!="" && product.cim_detail != "" && ! isNaN(product.cim_compliant_fields)){

             // CIM
             try{
                let JSONTestFirst = JSON.parse(product.cim_detail) // if we can't read this JSON, don't continue
                let myCIMDetail = {}
                let myCIMFieldPercent = 0
                if(Object.keys(JSONTestFirst)[0].indexOf("DS") == 0){
                     // console.log("Looking for ", $(".ds_datasource_active").attr("id"), "in", JSONTestFirst, "with", JSONTestFirst[$(".ds_datasource_active").attr("id")])
                    if(JSONTestFirst[$(".ds_datasource_active").attr("id")]){
                        myCIMDetail = JSONTestFirst[$(".ds_datasource_active").attr("id")]
                         // console.log("Here's my detail", myCIMDetail)
                        let success = 0;
                        let total = 0;

                        for(let field in myCIMDetail){
                            if(myCIMDetail[field]['success'] / (myCIMDetail[field]['success']+myCIMDetail[field]['failure']) > 0.8){
                                success++;
                            }
                            total++;
                        }
                        myCIMFieldPercent = success / total
                    }
                }
                descriptionBlock.append($('<td>' + (Math.round(10000 * myCIMFieldPercent) / 100) + "%" + '</td>').append($("<a>").attr("data-metadata", JSON.stringify(myCIMDetail)).text(" (?)").click(function(evt){
                    let obj = $(evt.target);
                    let cim_detail = obj.attr("data-metadata")
                    cim_detail = JSON.parse(cim_detail);
                    

                    require(['app/Splunk_Security_Essentials/components/controls/Modal', "json!" + Splunk.util.make_full_url("/static/app/Splunk_Security_Essentials/components/data/lightweight_cim_regex.json")], function(Modal, lightweight_cim_regex){
                        let myTable = $('<table class="table"><thead><tr><th>Field</th><th># Successes</th><th># Failures</th><th>Regex</th></tr></thead><tbody></tbody></table>')
                        for(let field in cim_detail){
                            let success = cim_detail[field]['success'] || 0
                            let failure = cim_detail[field]['failure'] || 0
                            let regex = ""
                            if(field in lightweight_cim_regex){
                                regex = $("<pre>").text(lightweight_cim_regex[field])
                            }
                            myTable.find("tbody").first().append($("<tr>").append($("<td>").text(field), $("<td>").text(success), $("<td>").text(failure), $("<td>").append(regex)))
                        }
                         // console.log("Got a click", cim_detail)
                        let myModal = new Modal("explainCIM", {
                            title: _("CIM Detail").t(),
                            backdrop: 'static',
                            keyboard: true,
                            destroyOnHide: true,
                            type: 'wide'
                        });

                        myModal.body.html(myTable)

                        myModal.footer.append($('<button>').attr({
                            type: 'button',
                            'data-dismiss': 'modal'
                        }).addClass('btn btn-primary').text( _('Close').t() ).on('click', function() {
                            // Not taking any action here
                        }))
                        myModal.show(); // Launch it!
                    })
                    
                    return false;
                })))
             }catch(error){
                descriptionBlock.append('<td>N/A</td>')
             }
        }else{
            descriptionBlock.append('<td>N/A</td>')
        }
        
        descriptionBlock.append('<td>' + (product.termsearch || "" ) + '</td>') // TERM Search
        
        return {"titleRow": titleRow, "descriptionRow": descriptionRow}

    
}

require(["underscore", 'json!' + $C['SPLUNKD_PATH'] + '/services/pullCSV?config=data-inventory-config'], function(_, data_inventory_config){
    function addOrUpdateRowToDraw(newObject){
        grayoutAddProducts();
        if($(".data-inventory-product[data-productid=" + newObject['productId'].replace(/([^a-zA-Z0-9\-_=\.\]\[])/g, "\\$1") + "]").length > 0 ){
            updateRow($(".ds_datasource_active").attr("id"), newObject['productId'], data_inventory_config)
        }else{
            addRow($(".ds_datasource_active").attr("id"), newObject['productId'], data_inventory_config)
        }
    }
    window.addOrUpdateRowToDraw = addOrUpdateRowToDraw
})

function addRow(eventtypeId, productId, data_inventory_config){
    let product = {}
    //console.log("Looking at ", JSON.stringify(window.data_inventory_products))
    for(let i = 0; i < window.data_inventory_products.length; i++){
        if(window.data_inventory_products[i].productId == productId && window.data_inventory_products[i].eventtypeId.split("|").indexOf(eventtypeId) >= 0){
            product = window.data_inventory_products[i];
        }
    }
    
    let rows = generateRow(product, data_inventory_config)
     // console.log("got our return", rows)
    $(".ds_main_panel").find("table.product-list").first().find("tbody").first().append(rows['titleRow'], rows['descriptionRow'])
    toggleNoProducts(eventtypeId);
}

function updateRow(eventtypeId, productId, data_inventory_config){
    let product = {}
    //console.log("Looking at ", JSON.stringify(window.data_inventory_products))
    for(let i = 0; i < window.data_inventory_products.length; i++){
        if(window.data_inventory_products[i].productId == productId && window.data_inventory_products[i].eventtypeId.split("|").indexOf(eventtypeId) >= 0){
            product = window.data_inventory_products[i];
        }
    }
    let rows = generateRow(product, data_inventory_config)
    let original_product_id = window.original_product_id
    if(! original_product_id){
        original_product_id = productId
    }
    $(".ds_main_panel").find("table.product-list").find("tbody").find("tr.data-inventory-product[data-productid=" + original_product_id.replace(/([^a-zA-Z0-9\-_=\.\]\[])/g, "\\$1") + "]").replaceWith(rows['titleRow'])
    $(".ds_main_panel").find("table.product-list").find("tbody").find("tr.data-inventory-product-description[data-productid=" + original_product_id.replace(/([^a-zA-Z0-9\-_=\.\]\[])/g, "\\$1") + "]").replaceWith(rows['descriptionRow'])
    toggleNoProducts(eventtypeId);
}

function removeRow(eventtypeId, productId){
    handleKVStoreProductRemoval(eventtypeId, productId);
    $(".ds_main_panel").find("table.product-list").find("tbody").find("tr[data-productid=" + productId + "]").remove()
    toggleNoProducts(eventtypeId);
}

function toggleNoProducts(eventtypeId){
    let _ = require("underscore")
    let numRows = $(".ds_main_panel").find("table.product-list").find("tbody").find("tr.data-inventory-product").length;
    $(".ds_main_panel").find("tr.data-inventory-no-products-here").remove()
    if(numRows==0){
        let promptStatus = "prompt";
        for(let i = 0; i < window.data_inventory_eventtypes.length; i++){
            if(eventtypeId == window.data_inventory_eventtypes[i].eventtypeId){
                if(window.data_inventory_eventtypes[i].status == "pending" || window.data_inventory_eventtypes[i].status == "searching"){
                    promptStatus = "inprogress" 
                }else if(window.data_inventory_eventtypes[i].status == "manualnodata"){
                    promptStatus = "manualnodata" 
                }else{
                    promptStatus = "dontprompt"
                    for(let g = 0; g < window.data_inventory_products.length; g++){
                        if(window.data_inventory_products[g].eventtypeId.indexOf(eventtypeId) >= 0 && (window.data_inventory_products[g].status == "pending" || window.data_inventory_products[g].status == "searching")){
                            promptStatus = "inprogress"
                        }
                    }
                }
                break;
            }
        }
        if($(".ds_main_panel").find("tr.data-inventory-no-products-here").length == 0 ||  ! $(".ds_main_panel").attr("data-promptstatus") || $(".ds_main_panel").attr("data-promptstatus") != promptStatus){
            $(".ds_main_panel").attr("data-promptstatus", promptStatus)
            let newRow = $('<tr class="data-inventory-no-products-here"><td colspan="6"></td></tr>')
            if(promptStatus == "prompt"){
                newRow.find("td").css("text-align", "center").html("<h3>" + _('No Products Found').t() + "</h3><p>" + _("You might consider using the Automatic Introspection button to look for relevant data automatically, or you can click Add Product to manually define what products you have in your environment. If you know that you have no data of this type, click \"No Data Present.\"").t() + "</p>")
            } else if(promptStatus == "inprogress"){
                newRow.find("td").css("text-align", "center").html("<h3>" + _('Introspection in Progress').t() + "</h3><p>" + _("Automated introspection is in progress -- check the Automated Introspection button for the current status. You can also click Add Product to add products that won't be found through introspection. If you know that you have no data of this type, click \"No Data Present.\"").t() + "</p>")
            } else if(promptStatus == "manualnodata"){
                newRow.find("td").css("text-align", "center").html("<h3>" + _('No Data').t() + "</h3><p>" + _("You previously configured that there is no data present for this type of data. You can always (re-)run Automated introspection, or hit the Add Product button below if you later acquire data.").t() + "</p>")
            } else { // dontprompt
                newRow.find("td").css("text-align", "center").html("<h3>" + _('No Products Found').t() + "</h3><p>" + _("Automated introspection found no products for this data type. You can click Add Product to add products that weren't found through introspection, or if you know that you have no data of this type, click \"No Data Present.\"").t() + "</p>")
            }
            $(".ds_main_panel").find("table.product-list").first().find("tbody").first().append(newRow)
        }
    
    }
}

function intersectArrays(a, b) {
    // https://stackoverflow.com/questions/16227197/compute-intersection-of-two-arrays-in-javascript
    var t;
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function (e) {
        return b.indexOf(e) > -1;
    });
}

function addOrEditModal(passedProduct){
    let product = {};
    if(passedProduct){
        product = passedProduct
    }


    require(["backbone", 
    "underscore", 
    "jquery", 
    "module", 
    "views/Base", 
    "models/Base",  
    "collections/Base", 
    "views/shared/controls/StepWizardControl", 
    'app/Splunk_Security_Essentials/components/controls/Modal',
    "splunkjs/mvc/simpleform/input/dropdown",
    "splunkjs/mvc/searchmanager",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/tokenutils",
    "splunkjs/mvc/simpleform/formutils",
    'json!' + $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products?bust=' + Math.random()*100000000,
    'json!' + $C['SPLUNKD_PATH'] + '/services/pullCSV?config=data-inventory-config'
],
    function(Backbone, 
        _, 
        $, 
        module,  
        BaseView, 
        BaseModel, 
        BaseCollection, 
        StepWizardControl, 
        Modal, 
        DropdownInput, 
        SearchManager,
        utils,
        tokenutils,
        FormUtils,
        InventoryProductsLatest,
        data_inventory_config){ 

    delete window.original_product_id; 

    // Clear tokens at the outset
    splunkjs.mvc.Components.getInstance("submitted").unset("index")
    splunkjs.mvc.Components.getInstance("submitted").unset("sourcetype")
    splunkjs.mvc.Components.getInstance("submitted").unset("productName")
    splunkjs.mvc.Components.getInstance("submitted").unset("vendorName")
    splunkjs.mvc.Components.getInstance("default").unset("index")
    splunkjs.mvc.Components.getInstance("default").unset("sourcetype")
    splunkjs.mvc.Components.getInstance("default").unset("productName")
    splunkjs.mvc.Components.getInstance("default").unset("vendorName")
    splunkjs.mvc.Components.getInstance("submitted").unset("form.index")
    splunkjs.mvc.Components.getInstance("submitted").unset("form.sourcetype")
    splunkjs.mvc.Components.getInstance("submitted").unset("form.productName")
    splunkjs.mvc.Components.getInstance("submitted").unset("form.vendorName")
    splunkjs.mvc.Components.getInstance("default").unset("form.index")
    splunkjs.mvc.Components.getInstance("default").unset("form.sourcetype")
    splunkjs.mvc.Components.getInstance("default").unset("form.productName")
    splunkjs.mvc.Components.getInstance("default").unset("form.vendorName")

    splunkjs.mvc.Components.getInstance("default").set("eventtypeId", $(".ds_datasource_active").attr("id"))
    splunkjs.mvc.Components.getInstance("submitted").set("eventtypeId", $(".ds_datasource_active").attr("id"))

    
    let main = $("<div>").addClass("edit-modal-main-div").attr("data-product-encoded", JSON.stringify(product));
    let config_sections = {}
    for(let i = 0; i < data_inventory_config.length; i++){
        if(! config_sections[data_inventory_config[i].header]){
            config_sections[data_inventory_config[i].header] = []
        }
        config_sections[data_inventory_config[i].header].push(data_inventory_config[i])
    }
    for(let config_section in config_sections){
        config_sections[config_section].sort(function(a, b) {
            if(! a.sortOrder || ! parseInt(a.sortOrder) ){
                return -1;
            }
            if(! b.sortOrder || ! parseInt(b.sortOrder) ){
                return 1;
            }
            if (a.sortOrder > b.sortOrder) {
                return 1;
            }
            if (a.sortOrder < b.sortOrder) {
                return -1;
            }
            return 0;
        });
    }

    if(product && product.productId){
         // console.log("Got a product", product);
        window.original_product_id = product.productId
        let newTokens = {}
        if(product.eventtypeId && product.eventtypeId != ""){
            newTokens["eventtypeId"] = product.eventtypeId
        }else{
            newTokens["eventtypeId"] = $(".ds_datasource_active").attr("id")
        }
        if(product.basesearch){
            if(product.basesearch.match(/^index="*\S*"* sourcetype="*\S*"*$/)){
                newTokens["index"] = product.basesearch.match(/^index="*(\S*?)"* sourcetype="*(\S*?)"*$/)[1]
                newTokens["sourcetype"] = product.basesearch.match(/^index="*(\S*?)"* sourcetype="*(\S*?)"*$/)[2]
                newTokens["form.index"] = product.basesearch.match(/^index="*(\S*?)"* sourcetype="*(\S*?)"*$/)[1]
                newTokens["form.sourcetype"] = product.basesearch.match(/^index="*(\S*?)"* sourcetype="*(\S*?)"*$/)[2]
            }else{
                splunkjs.mvc.Components.getInstance("submitted").unset("index")
                splunkjs.mvc.Components.getInstance("submitted").unset("sourcetype")
                splunkjs.mvc.Components.getInstance("submitted").unset("form.index")
                splunkjs.mvc.Components.getInstance("submitted").unset("form.sourcetype")
            }
        }
        if(product.productName){
            newTokens["productName"] = product.productName
            newTokens["form.productName"] = product.productName
        }
        if(product.vendorName){
            newTokens["vendorName"] = product.vendorName
            newTokens["form.vendorName"] = product.vendorName
        }
         // console.log("Before", splunkjs.mvc.Components.getInstance("submitted").toJSON())
         // console.log("Got my tokens", newTokens)
        splunkjs.mvc.Components.getInstance("submitted").set(newTokens)
        splunkjs.mvc.Components.getInstance("default").set(newTokens)
        // setTimeout(function(){console.log("After", splunkjs.mvc.Components.getInstance("submitted").toJSON())},300)
    }else{
         // console.log("Did not get a product!");
    }

    // Setup for Status Container
    let statusContainer = $('<div>').addClass("data-inventory-add-data-status")


    // Init
    let options = {
        "dropdowns": {
            "option": "",
            "show": "display: none; "
        },
        "search": {
            "option": "",
            "show": "display: none; "
        },
        "manual": {
            "option": "",
            "show": "display: none; "
        },
        "planned": {
            "option": "",
            "show": "display: none; "
        },
        "productlist": {
            "option": "",
            "show": "display: none; "
        },
        "customentry": {
            "option": "",
            "show": "display: none; "
        }
    }
    
    // First handle the step-by-step status container
    let steps = [
     /*   {
            "label": _("Check Existing Products").t(),
            "divid": "data-inventory-add-existing-product",
            "validation": function(){
                return true;
            }
        },*/
        {
            "label": _("Locate Data").t(),
            "divid": "data-inventory-add-data-location",
            "validation": function(){
                window.temp_base_search = ""
                let returnValue = false;
                if($("#data-inventory-add-data-location").find("input[type=radio]:checked").length == 0){
                    returnValue = false;
                }else{
                    let setting = $("#data-inventory-add-data-location").find("input[type=radio]:checked").val()
                    
                    if(setting == "manual"){
                        returnValue = true;
                    }else if(setting == "future"){
                        returnValue = true;
                    }else if(setting == "box"){
                        if($("#changeBaseViaBox").find("textarea").val() != "" && $("#changeBaseViaBox").find("textarea").val().match(/\S{1,}/)){
                            window.temp_base_search = $("#changeBaseViaBox").find("textarea").val()
                            returnValue = true
                        }else{
                            returnValue = false;
                        }
                    }else if(setting == "dropdown"){
                        if(
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['index'] && 
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['index']!="" &&
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype'] && 
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype']!=""
                            ){
                                window.temp_base_search = "(index=\"" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['index'] + "\" sourcetype=\"" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype'] + "\")"
                                returnValue = true;
                        }else{
                            returnValue = false;
                        }
                    }
                }
                if(returnValue){
                    if($("#confirmAdditionalDataProduct").length > 0){
                        return false;
                    }else if(window.temp_base_search == "" || (window.authorizedToContinueDataSelection && window.authorizedToContinueDataSelection == window.temp_base_search)){
                        return true
                    }else{
                        let shouldReturnTrue = true;
                        for(let i = 0; i < window.data_inventory_products.length; i++){
                            let provided_search_no_parens = window.temp_base_search.replace(/"/g, "").replace(/^\(/, "").replace(/\)$/, "")
                            let provided_search_parens = "(" + window.temp_base_search.replace(/"/g, "").replace(/^\(/, "").replace(/\)$/, "") + ")"
                            
                            if(window.data_inventory_products[i]['basesearch'] &&
                                ( window.data_inventory_products[i]['basesearch'].replace(/"/g, "") == provided_search_no_parens ||  window.data_inventory_products[i]['basesearch'].replace(/"/g, "") == provided_search_parens 
                                    || window.data_inventory_products[i]['basesearch'].replace(/"/g, "").indexOf(provided_search_parens) >= 0 ) && 
                                    ( ! window.original_product_id || window.original_product_id != window.data_inventory_products[i]['productId'])
                                    ){
                                        // console.log("Looking at the productId - 1", window.original_product_id, window.data_inventory_products[i]['productId'])
                                        // should match if our provided string matches (with or without parens), or if our provided string is embedded in any other string
                                shouldReturnTrue = false;
                                if( window.original_product_id && intersectArrays(window.data_inventory_products[i]['eventtypeId'].split("|"), splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"].split("|")).length > 0){
                                    // console.log("Looking at the productId - 2", window.original_product_id, window.data_inventory_products[i]['productId'])
                                    let intersection = intersectArrays(window.data_inventory_products[i]['eventtypeId'].split("|"), splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"].split("|"))
                                    // console.log("Got the following intersection")
                                    let dscOverlap = $("<ul>");
                                    for(let i = 0; i < intersection.length; i++){
                                        dscOverlap.append($("<li>").text(intersection[i]))
                                    }
                                    let myBody = $("<div>").append(
                                        $("<p>").text(_("It looks like there's already a product configured with this data location.").t()), 
                                        $("<p>").text(_("You provided: ").t()),
                                        $("<pre>").text(window.temp_base_search),
                                        $("<p>").text(Splunk.util.sprintf(_("And we found %s - %s, which has the data location:").t(), window.data_inventory_products[i]['vendorName'], window.data_inventory_products[i]["productName"])),
                                        $("<pre>").text(window.data_inventory_products[i]['basesearch']),
                                        $("<p>").text(_("What's more, that product is already configured to run on similar Data Source Categories! The overlap is:").t()),
                                        dscOverlap,
                                        $("<p>").text(_("Please revisit your data location, or your data source category mapping, before proceeding.").t())
                                    )

                                    // Now we initialize the Modal itself
                                    var myModal = new Modal("confirmAdditionalDataProduct", {
                                        title: _("Additional Data Product").t(),
                                        backdrop: 'static',
                                        keyboard: true,
                                        destroyOnHide: true,
                                        type: 'wide'
                                    });
                                    myModal.body.append(myBody)
            
                                    myModal.footer.append($('<button>').attr({
                                        type: 'button',
                                        'data-dismiss': 'modal'
                                    }).addClass('btn ').text(_('Cancel').t()).on('click', function() {
                                        // Not taking any action here
                                    }))
                                    
                                    myModal.show()
                                    
                                    
                                    
                                }else{

                                    // console.log("Looking at the productId - 3", window.original_product_id, window.data_inventory_products[i]['productId'])
                                    let listOfDSCs = $("<ul>");
                                    let eventtypeIds = window.data_inventory_products[i]['eventtypeId'].split("|")
                                    for(let i = 0; i <  eventtypeIds.length; i++){
                                        listOfDSCs.append($("<li>").text(  $("div#" + eventtypeIds[i]).parent().find("h2").first().text().replace(/ \(.*?\).*/, "") + " - " + $("div#" + eventtypeIds[i]).text() ))
                                    }
                                    let productNameP = $("<p>")
                                    if(window.data_inventory_products[i]['vendorName'] && window.data_inventory_products[i]['vendorName'] != ""){
                                        productNameP.text(Splunk.util.sprintf(_("And we found %s - %s, which has the data location:").t(), window.data_inventory_products[i]['vendorName'], window.data_inventory_products[i]["productName"]))
                                    }else{
                                        productNameP.text(_("And our introspection found a product (still awaiting confirmation), which has the data location:").t())
                                    }
                                    let myBody = $("<div>").append(
                                        $("<p>").text(_("It looks like there's already a product configured with this data location.").t()), 
                                        $("<p>").text(_("You provided: ").t()),
                                        $("<pre>").text(window.temp_base_search),
                                        productNameP,
                                        $("<pre>").text(window.data_inventory_products[i]['basesearch']),
                                        $("<p>").text(_("That product is configured in the following Data Source Categories:").t()),
                                        listOfDSCs,
                                        $("<p>").text(_("Would you like to add this product here?").t())
                                    )
                                    // Now we initialize the Modal itself
                                    var myModal = new Modal("confirmAdditionalDataProduct", {
                                        title: _("Additional Data Product").t(),
                                        backdrop: 'static',
                                        keyboard: true,
                                        destroyOnHide: true,
                                        type: 'wide'
                                    });

                                    myModal.body.append(myBody)
            
                                    myModal.footer.append($('<button>').attr({
                                        type: 'button',
                                        'data-dismiss': 'modal'
                                    }).addClass('btn ').text(_('Cancel').t()).on('click', function() {
                                        // Not taking any action here
                                    }), $('<button>').attr({
                                        type: 'button',
                                        'data-dismiss': 'modal'
                                    }).addClass('btn btn-primary add-product-here').text(_('Yes').t()).on('click', function() {
                                        // Not taking any action here
                                        // window.data_inventory_products[i]
                                        // window.authorizedToContinueDataSelection = window.temp_base_search
                                        // setTimeout(function(){validateCurrent()}, 100)



                                        $.ajax({
                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/?query={"_key": "' + window.data_inventory_products[i].productId + '"}',
                                            type: 'GET',
                                            contentType: "application/json",
                                            async: true,
                                            success: function(returneddata) {
                                                if (returneddata.length == 1) {
                                                    returneddata = returneddata[0]
                                                    let eventtypeIds = returneddata.eventtypeId.split("|");
                                                    if(eventtypeIds.indexOf($(".ds_datasource_active").attr("id")) == -1){
                                                        eventtypeIds.push( $(".ds_datasource_active").attr("id") );
                                                        
                                                        returneddata.eventtypeId = eventtypeIds.join("|")
                                                        window.data_inventory_products[i].eventtypeId = returneddata.eventtypeId;
                                                        notifyIntroElementsOfProductChange(returneddata);
                                                        $.ajax({
                                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + returneddata['_key'],
                                                            type: 'POST',
                                                            contentType: "application/json",
                                                            async: true,
                                                            data: JSON.stringify(returneddata),
                                                            success: function() { 
                                                                
                                                                $("#addProduct").modal("hide")
                                                                grayoutAddProducts()
                                                                addRow($(".ds_datasource_active").attr("id"), returneddata['productId'], data_inventory_config)
                                                                updateIconsAndCounts()
                                                            },
                                                            error: function(xhr, textStatus, error) {
                                                                triggerError("Error Updating", error)
                                                            }
                                                        })
                                                    }else{
                                                        triggerError("Are two people doing this simultaneously? Expected to find a product.")
                                                    }
                                                }
                                            }
                                        })





                                    }))

                                    
                                    myModal.show()
                                    
                                    
                                }
                            }
                        }
                        return shouldReturnTrue;
                    }
                }else{
                    return false;
                }
            }
        },
        {
            "label": _("Select Product").t(),
            "divid": "data-inventory-add-select-product",
            "validation": function(){
                let returnValue = false;
                let productId = ""
                if($("#data-inventory-add-select-product").find("input[type=radio]:checked").length == 0){
                    returnValue = false;
                }else{
                    let setting = $("#data-inventory-add-select-product").find("input[type=radio]:checked").val()
                
                    if(setting == "notprovided"){
                        returnValue = true;
                        productId = "This_will_always_be_unique_because_theres_a_random_number" + Math.round(Math.random()*10000000);
                    }else if(setting == "customentry"){
                        if($("#add-data-inventory-vendor-input").val() != "" && $("#add-data-inventory-vendor-input").val().match(/\S{1,}/) && 
                        $("#add-data-inventory-product-input").val() != "" && $("#add-data-inventory-product-input").val().match(/\S{1,}/)){
                            returnValue = true
                            productId = $("#add-data-inventory-vendor-input").val().replace(/ /g, "_").replace(/[^a-zA-Z_]/g, "") + "__" + $("#add-data-inventory-product-input").val().replace(/ /g, "_").replace(/[^a-zA-Z_]/g, "");
                        }else{
                            returnValue = false;
                        }
                    }else if(setting == "productlist"){
                        if(
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['productName'] && 
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['productName']!="" &&
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['vendorName'] && 
                            splunkjs.mvc.Components.getInstance("submitted").toJSON()['vendorName']!=""
                            ){
                                returnValue = true;
                                productId = splunkjs.mvc.Components.getInstance("submitted").toJSON()['vendorName'].replace(/ /g, "_").replace(/[^a-zA-Z_]/g, "") + "__" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['productName'].replace(/ /g, "_").replace(/[^a-zA-Z_]/g, "");
                        }else{
                            returnValue = false;
                        }
                    }
                }
                if(returnValue){
                    for(let i = 0; i < window.data_inventory_products.length; i++){
                        if(productId == window.data_inventory_products[i]['productId'] 
                            && ! areSearchesTheSame(window.data_inventory_products[i]['basesearch'], window.temp_base_search) && window.original_product_id != window.data_inventory_products[i]['productId'] && window.data_inventory_products[i]['basesearch'] != ""
                            && isThisProductUsed(window.data_inventory_products[i])){
                            // console.log("Got a productId match with", productId, window.data_inventory_products[i])
                            if($("#confirmAdditionalDataLocation").length == 0 && (! window.AreWeValidatingTheAdditionalDataLocation || window.AreWeValidatingTheAdditionalDataLocation != productId)){
                                splunkjs.mvc.Components.getInstance("submitted").on("change:productName change:vendorName", function(evt, newValue){
                                    if(window.AreWeValidatingTheAdditionalDataLocation && typeof newValue == "undefined" && (typeof evt.changed.productName == "undefined" || typeof evt.changed.vendorName == "undefined")){
                                        delete window.AreWeValidatingTheAdditionalDataLocation
                                    }
                                    
                                    
                                })
                                // Now we initialize the Modal itself
                                var myModal = new Modal("confirmAdditionalDataLocation", {
                                    title: _("Additional Data Location").t(),
                                    backdrop: 'static',
                                    keyboard: true,
                                    destroyOnHide: true,
                                    type: 'wide'
                                });
                                let listOfDSCs = $("<ul>");
                                let eventtypeIds = window.data_inventory_products[i]['eventtypeId'].split("|")
                                for(let i = 0; i <  eventtypeIds.length; i++){
                                    listOfDSCs.append($("<li>").text(  $("div#" + eventtypeIds[i]).parent().find("h2").first().text().replace(/ \(.*?\).*/, "") + " - " + $("div#" + eventtypeIds[i]).text() ))
                                }
                                myModal.body.append($("<p>" + Splunk.util.sprintf(_("You previously had %s - %s stored at:").t(), window.data_inventory_products[i]['vendorName'], window.data_inventory_products[i]["productName"]) + "</p>"), 
                                                    $("<pre>").text(window.data_inventory_products[i].basesearch),
                                                    $("<p>" + _("Do you also want to add this new location, or replace the existing value?").t() + "</p>"),
                                                    $("<pre>").text(window.temp_base_search),
                                                    $("<p>" + _("This will effect the following Data Source Categories:").t() + "</p>"),
                                                    listOfDSCs)
        
                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn ').text(_('Cancel, Go Back').t()).on('click', function() {
                                     // console.log("Update j")
                                    // Not taking any action here
                                    window.AreWeValidatingTheAdditionalDataLocation = productId
                                }), $('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn').addClass("add-location-button").text(_('Add It').t() ).on('click', function() {
                                     // console.log("Update k", window.data_inventory_products[i])
                                    let eventtypeIds = window.data_inventory_products[i].eventtypeId.split("|");
                                    if(eventtypeIds.indexOf(splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"]) == -1){
                                        eventtypeIds.push( splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"] );
                                    }
                                    window.data_inventory_products[i].eventtypeId = eventtypeIds.join("|")
                                    if(! window.data_inventory_products[i].basesearch.match(/^\(.*\)$/)){
                                        window.data_inventory_products[i].basesearch = "(" + window.data_inventory_products[i].basesearch + ")"
                                    }
                                    if(! window.temp_base_search.match(/^\(.*\)$/)){
                                        window.temp_base_search = "(" + window.temp_base_search + ")"
                                    }
                                    if(window.data_inventory_products[i].termsearch && ! window.data_inventory_products[i].termsearch.match(/^\(.*\)$/)){
                                        window.data_inventory_products[i].termsearch = "(" + window.data_inventory_products[i].termsearch + ")"
                                    }
                                    if(window.data_inventory_products[i].basesearch != window.temp_base_search){
                                        window.data_inventory_products[i]['basesearch'] = window.data_inventory_products[i].basesearch + " OR " + window.temp_base_search
                                    }
                                    if(! window.data_inventory_products[i].termsearch || window.data_inventory_products[i].termsearch != window.temp_base_search){
                                        window.data_inventory_products[i]['termsearch'] = ""
                                    }
                                    
                                    
                                    window.data_inventory_products[i].status = "analyzing"
                                    
                                    notifyIntroElementsOfProductChange(window.data_inventory_products[i]);

                                    huntForNewAnalyzingProducts()
                                    $.ajax({
                                        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + window.data_inventory_products[i]['_key'],
                                        type: 'POST',
                                        contentType: "application/json",
                                        async: true,
                                        data: JSON.stringify(window.data_inventory_products[i]),
                                        success: function(returneddata) {bustCache(); newkey = returneddata },
                                        error: function(xhr, textStatus, error) {
                                            //              console.log("Error Updating!", xhr, textStatus, error)
                                        }
                                    })

                                    if(window.original_product_id){
                                        notifyIntroElementsOfProductDelete(window.original_product_id);

                                        $.ajax({
                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + window.original_product_id,
                                            type: 'DELETE',
                                            contentType: "application/json",
                                            async: true,
                                            success: function(returneddata) {bustCache(); newkey = returneddata },
                                            error: function(xhr, textStatus, error) {
                                                //              console.log("Error Updating!", xhr, textStatus, error)
                                            }
                                        })

                                        for(let i = 0; i < window.data_inventory_products.length; i++){
                                            if(window.data_inventory_products[i].productId == window.original_product_id){
                                                window.data_inventory_products.splice(i, 1);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if($(".ds_datasource_active").length > 0){
                                        $(".data-inventory-draw-container").remove()
                                        createTable($(".ds_datasource_active").attr("id"))
                                        grayoutAddProducts()
                                    }
                                    
                                    $("#addProduct").modal("hide");
                                }), $('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn').addClass("use-new-location-button").text(_('Use the new Location instead (keep the new and old Data Source Categories)').t()).on('click', function() {
                                     // console.log("Update l")
                                    window.data_inventory_products[i].basesearch = window.temp_base_search;
                                    
                                    let eventtypeIds = window.data_inventory_products[i].eventtypeId.split("|");
                                    if(eventtypeIds.indexOf($(".ds_datasource_active").attr("id")) == -1){
                                        eventtypeIds.push( $(".ds_datasource_active").attr("id") );
                                    }
                                    window.data_inventory_products[i].eventtypeId = eventtypeIds.join("|")
                                    window.data_inventory_products[i].status = "analyzing"
                                    
                                    notifyIntroElementsOfProductChange(window.data_inventory_products[i]);

                                    huntForNewAnalyzingProducts()
                                    $.ajax({
                                        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + window.data_inventory_products[i]['_key'],
                                        type: 'POST',
                                        contentType: "application/json",
                                        async: true,
                                        data: JSON.stringify(window.data_inventory_products[i]),
                                        success: function(returneddata) {bustCache(); newkey = returneddata },
                                        error: function(xhr, textStatus, error) {
                                            //              console.log("Error Updating!", xhr, textStatus, error)
                                        }
                                    })
        
                                    if(window.original_product_id){
                                        notifyIntroElementsOfProductDelete(window.original_product_id);

                                        $.ajax({
                                            url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + window.original_product_id,
                                            type: 'DELETE',
                                            contentType: "application/json",
                                            async: true,
                                            success: function(returneddata) {bustCache(); newkey = returneddata },
                                            error: function(xhr, textStatus, error) {
                                                //              console.log("Error Updating!", xhr, textStatus, error)
                                            }
                                        })

                                        for(let i = 0; i < window.data_inventory_products.length; i++){
                                            if(window.data_inventory_products[i].productId == window.original_product_id){
                                                window.data_inventory_products.splice(i, 1);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    $("#addProduct").modal("hide");

                                    if($(".ds_datasource_active").length > 0){
                                        $(".data-inventory-draw-container").remove()
                                        createTable($(".ds_datasource_active").attr("id"))
                                        grayoutAddProducts()
                                    }
                                }))
                                myModal.show(); // Launch it!
    
                            }else{
                                 // console.log("Didn't follow on with that though", window.AreWeValidatingTheAdditionalDataLocation, productId)
                            }
                            
                            
                        }
                    }
                    return true; 
                }else{
                    return false;
                }
            }
        },
        {
            "label": _("Define Coverage").t(),
            "divid": "data-inventory-add-determine-coverage",
            "validation": function(){
                return true;

            }
        },
        {
            "label": _("Indexes + Sourcetypes").t(),
            "divid": "data-inventory-indexes-and-sourcetypes",
            "validation": function(){
                if(! $("#data-inventory-indexes-and-sourcetypes").attr("data-was-validated") || $("#data-inventory-indexes-and-sourcetypes").attr("data-was-validated") == "success"){
                    return true;
                }else{
                    return false;
                }
            }
        },
    ]
    for(let config_section in config_sections){
        steps.push(
            {
                "label": _(config_section).t(),
                "divid": "data-inventory-metadata-" + config_section.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, ""),
                "validation": function(){
                    let div = $("#" + "data-inventory-metadata-" + config_section.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, ""));
                    let requiredInputs = div.find(".metadata-input-required")
                    for(let i = 0; i < requiredInputs.length; i++){
                        if(!$(requiredInputs[i]).val() || $(requiredInputs[i]).val() == ""){
                            return false;
                        }
                    }
                    return true;
                }
            })
    }
    steps.push(
        {
            "label": _("Complete").t(),
            "divid": "data-inventory-add-complete",
            "validation": function(){
                return true;
            }
        })


    function validateCurrent(){
        let currentStep = window.wizardStepsChild.getCurrIndex();
        if(!steps[currentStep]['validation'] || steps[currentStep]['validation']()){
            let elem = document.getElementById(steps[currentStep].divid);
            let validatedEvent = new Event('validated');
            if(elem){
                elem.dispatchEvent(validatedEvent);
            }
             // console.log("Validated Success")
            $(".nav-buttons").find(".next-button").removeAttr("disabled")
            return true;
        }else{
             // console.log("Validated Failure")
            $(".nav-buttons").find(".next-button").attr("disabled", "disabled")
            return false;
        }
    }
    function ProductAndKVStoreUpdate(updateComplete){
         // console.log("Here's the updated element!")
        let record = {
            "productId": "", 
            "basesearch": "", 
            "productName": "", 
            "vendorName": "", 
            "sourcetype": "",
            "index": "",
            "metadata_json": {},
            "eventtypeId": splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"], 
            "status": "analyzing",
            "stage": "step-eventsize",
            "termsearch": ""
        }
        let metadata_fields = $(".metadata-input")
        for(let i = 0; i < metadata_fields.length; i++ ){
            record.metadata_json[ $(metadata_fields[i]).attr("data-field") ] = $(metadata_fields[i]).val()
        }
        record.metadata_json = JSON.stringify(record.metadata_json);

        let locateDataSetting = $("#data-inventory-add-data-location").find("input[type=radio]:checked").val()
        if(locateDataSetting == "future"){
            record['status'] = "nearFuture";
        }else if(locateDataSetting == "manual"){
            record['status'] = "manual";
            record["stage"] = "all-done"
        }else if(locateDataSetting == "box"){
            record["basesearch"] = $("#changeBaseViaBox").find("textarea").val()
        }else if(locateDataSetting == "dropdown"){
            record["basesearch"] = 'index="' + splunkjs.mvc.Components.getInstance("submitted").toJSON()['index'] + '" sourcetype="' + splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype'] + '"'
        }

        let termSearch = $("#data-inventory-indexes-and-sourcetypes").attr("data-termsearch");
        if(termSearch && termSearch != ""){
            record["termsearch"] = termSearch;
        }
        
        let coverageLevel = $("input#slider-exact-number").val();
        if(coverageLevel && coverageLevel != ""){
            record["coverage_level"] = coverageLevel
        }

        let productSetting = $("#data-inventory-add-select-product").find("input[type=radio]:checked").val()
        if(productSetting == "notprovided"){
            record["productName"] = "Not Provided";
            record["vendorName"] = "Not Provided";
        }else if(productSetting == "customentry"){
            record["productName"] = $("#add-data-inventory-product-input").val();
            record["vendorName"] = $("#add-data-inventory-vendor-input").val();
        }else if(productSetting == "productlist"){
            record["productName"] = splunkjs.mvc.Components.getInstance("submitted").toJSON()['productName']
            record["vendorName"] = splunkjs.mvc.Components.getInstance("submitted").toJSON()['vendorName']
        }
        if(record["productName"] == "Not Provided" && record["basesearch"] == ""){
            record["productId"] = "NOTPROVIDED_" + splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"] + "_NOSPL_ID_" + Math.round(Math.random()*10000000);
        }else if(record["productName"] == "Not Provided"){
            record["productId"] = "NOTPROVIDED_" + splunkjs.mvc.Components.getInstance("submitted").toJSON()["eventtypeId"] + "_SPL_" + record["basesearch"].replace(/[=\s]/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
        }else{
             // console.log("My input","product",record["productName"],  record["productName"].replace(/ /g, "_").replace(/[^a-zA-Z0-9\-\_]/g, ""))
             // console.log("My input","vendor",record["vendorName"],  record["vendorName"].replace(/ /g, "_").replace(/[^a-zA-Z0-9\-\_]/g, ""))
            record["productId"] = ProductAndVendorToProductId(record["vendorName"], record["productName"])
        }
        if(record["productId"] == window.original_product_id){
            let wereChangesMade=false
            let newRecord = {}
            for(let i = 0; i < window.data_inventory_products.length; i++){
                if(window.data_inventory_products[i].productId == window.original_product_id){
                    let relevantKeys= ["productName", "vendorName", "termsearch", "coverage_level", "basesearch", "status", "metadata_json"]
                    for(let g = 0; g < relevantKeys.length; g++){
                         // console.log("Found the same productId", "looking at", relevantKeys[g], record[relevantKeys[g]])
                        if(record[relevantKeys[g]] && record[relevantKeys[g]] != ""){
                            window.data_inventory_products[i][relevantKeys[g]] = record[relevantKeys[g]];
                            wereChangesMade = true
                        }
                    }
                    newRecord = window.data_inventory_products[i]
                }
            }
             // console.log("Found the same productId", wereChangesMade, record, newRecord)
            if(wereChangesMade){
                record = newRecord
            }
            
            
        }else{
             // console.log("Found not the same productId", record["productId"], window.original_product_id)
        }
        
        record["_key"] = record["productId"];
         // console.log("Got our record", record)
         // console.log("Got our locateDataSetting", locateDataSetting)
         // console.log("Got our productSetting", productSetting)
        
        handleNewKVStoreProductUpdate(record, updateComplete)
        return record
    }
    window.validateCurrent = validateCurrent

     // console.log("Got it", InventoryProductsLatest)

    // Setup for metadata configured
    let metadata_divs = []
    let metadata_configured = {};
    if(product.metadata_json && product.metadata_json != "" && product.metadata_json.match(/^\{.*\}$/)){
        try{
            metadata_configured = JSON.parse(product.metadata_json)
        }
        catch(error){
            // 
        }
    }
    for(let config_section in config_sections){
        let config_id = config_section.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "")
        let div = $( "<div>").addClass("add-data-inventory-product-step").attr("id", "data-inventory-metadata-" + config_id).css("display", "none").append($('<a href="#" style="color: gray; float: right; font-size: 16pt;" class="data-inventory-tooltip-metadata-config icon-question-circle" ></a>').click(function(){
            let text = _("This step is automatically generated, and you can remove it (or add more items) by adjusting the lookup file SSE-data-inventory-config, via the lookup editor app. These settings can be optional or required. Out of the Box, Splunk Security Essentials includes a description field, but some environments will add items such as product owner, contact owner, SLA, or others. You can configure either \"text\" (a simple single line text box) or \"textarea\" (a larger text box).").t()
            // Now we initialize the Modal itself
            let myModal = new Modal("explainMetadataStep", {
                title: _("Product Metadata").t(),
                backdrop: 'static',
                keyboard: true,
                destroyOnHide: true,
                type: 'wide'
            });

            myModal.body.html($("<p>" + text + "</p>"))

            myModal.footer.append($('<button>').attr({
                type: 'button',
                'data-dismiss': 'modal'
            }).addClass('btn btn-primary').text( _('Close').t() ).on('click', function() {
                // Not taking any action here
            }))
            myModal.show(); // Launch it!
            return false;
            
        }));
        for(let i = 0; i < config_sections[config_section].length; i++){
            let element = config_sections[config_section][i];
            let id = config_id + "-" + element.field
            div.append($("<label>").attr("for", id).text(element.fieldName))
            let classtext = "metadata-input "
            let value = ""
            if( metadata_configured[element.field]){
                value = metadata_configured[element.field]
            }
            if(element.required.match(/^\s*(true|enabled|yes|1|y|t)\s*$/i)){
                classtext += " metadata-input-required"
                div.find("label").append(' <span style="color: red;">(required)</span>')
            }
            if(element.type == "textarea"){
                div.append($('<textarea style="width: 300px; height: 50px;">').attr("id", id).text(value).addClass(classtext).attr("data-field", element.field))
            }else if(element.type == "text"){
                div.append($('<input style="width: 300px;">').attr("id", id).value(value).addClass(classtext).attr("data-field", element.field))
            }
            if(element.fieldDescription && element.fieldDescription != ""){
                div.append($("<p>").text(element.fieldDescription))    
            }
        }
         // console.log("Here's my thing", div[0].outerHTML)
        metadata_divs.push(div)
    }

    // Setup for Data Location
    
    if(product.status && product.status == "nearFuture"){
        options["planned"]["option"] = " checked selected" ;
        options["planned"]["show"] = "display: block; ";
    }else if(product.status && product.status == "manual"){
        options["manual"]["option"] = " checked selected" ;
        options["manual"]["show"] = "display: block; ";
    }else if(product.basesearch && ! product.basesearch.match(/^index=\S* sourcetype=\S*$/)){
        options["search"]["option"] = " checked selected";
        options["search"]["show"] = "display: block; ";
    }else{
        options["dropdowns"]["option"] = " checked selected";
        options["dropdowns"]["show"] = "display: block; ";
    }


    let datalocationContainer =  $('<div class="add-data-inventory-product-step" id="data-inventory-add-data-location">')
    let dropdowns = $('<div style=" display: block;  clear: both;">')
    dropdowns.append(
        $('<input id="radiolocationbydropdowns" type="radio" name="datalocationradio" value="dropdown" style="float: left;" ' + options["dropdowns"]["option"] + '>').click(function() {
            $("#changeBaseViaDropdown").css("display", "block")
            $("#changeBaseViaBox").css("display", "none")
        }), $("<label for=\"radiolocationbydropdowns\">&nbsp;" + _("Locate By Index and Sourcetype").t() + "</label>"),
        $('<div style="position: relative; margin-left: 8px; border: solid 1px lightslategray; width: 800px; height: 85px; ' + options["dropdowns"]["show"] + '" id="changeBaseViaDropdown">').append(
            //$('<div class="grayout" style="position: absolute; z-index: 100;   width: 100%; height: 100%; background-color: gray; opacity: 0.5;"></div>'),
            $('<div style="width: 50%; display: table-cell; padding: 5px;">Index <div id="add-data-inventory-index-list"></div>'),
            $('<div style="width: 50%; display: table-cell; padding: 5px;">Sourcetype <div id="add-data-inventory-sourcetype-list"></div>')
            
        )
    )
    let search = $('<div style=" margin-top: 8px;  display: block;  clear: both;" >')
    search.append(
        $('<input id="radiolocationbysearch" type="radio" name="datalocationradio" value="box" style="float: left;" ' + options["search"]["option"] + '>').click(function() {
            $("#changeBaseViaDropdown").css("display", "none")
            $("#changeBaseViaBox").css("display", "block")
            $("#changeBaseViaBox").find("textarea").focus()
        }), $("<label for=\"radiolocationbysearch\">&nbsp;" + _("Locate By Search String").t() + "</label>"),
        $('<div style="position: relative; margin-left: 8px; border: solid 1px lightslategray; width: 800px; height: 85px; ' + options["search"]["show"] + '" id="changeBaseViaBox">').append(
            //$('<div class="grayout" style="position: absolute; z-index: 100; width: 100%; height: 100%; background-color: gray; opacity: 0.5;"></div>'),
            $('<textarea style="height: 75px; width: 790px; margin: 5px;">').text(product.basesearch))
    )


    let manualEntry = $('<div style=" margin-top: 8px;  width: 100%; display: block;  clear: both;" >')
    manualEntry.append(
        $('<input id="radiolocationmanual" type="radio" name="datalocationradio" value="manual" style="float: left;" ' + options["manual"]["option"] + '>').click(function() {
            $("#changeBaseViaDropdown").css("display", "none")
            $("#changeBaseViaBox").css("display", "none")
        }), $("<label for=\"radiolocationmanual\">&nbsp;" + _("Present in Splunk, but will provide SPL later (Data Availability Dashboard won't function without SPL)").t() + "</label>")
    )

    let planned = $('<div style=" margin-top: 8px;  width: 100%; display: block;  clear: both;" >')
    planned.append(
        $('<input id="radiolocationbyplanned" type="radio" name="datalocationradio" value="future" style="float: left;" ' + options["planned"]["option"] + '>').click(function() {
            $("#changeBaseViaDropdown").css("display", "none")
            $("#changeBaseViaBox").css("display", "none")
        }), $("<label for=\"radiolocationbyplanned\">&nbsp;" + _("Planned for the Near Future").t() + "</label>")
    )
    datalocationContainer.append(dropdowns, search, manualEntry, planned)




    // Setup for Product Selection
    options["productlist"]["option"] = " checked selected" ;
    options["productlist"]["show"] = "display: block; ";
    let productName = ""
    let vendorName = ""
    if(! /^(7\.[1-9]|[8-9])/.test($C["VERSION_LABEL"])){
        options["customentry"]["option"] = " checked selected";
        options["customentry"]["show"] = "display: block; ";
        if(splunkjs.mvc.Components.getInstance("submitted").toJSON()["productName"]){
            productName = splunkjs.mvc.Components.getInstance("submitted").toJSON()["productName"]
        }
        if(splunkjs.mvc.Components.getInstance("submitted").toJSON()["vendorName"]){
            vendorName = splunkjs.mvc.Components.getInstance("submitted").toJSON()["vendorName"]
        }
    }
    let selectProductContainer =  $('<div class="add-data-inventory-product-step" style="display: none;" id="data-inventory-add-select-product">')
    let existingProducts = $('<div style=" display: block;  clear: both;">')
    existingProducts.append(
        $('<input id="dataproductdropdown" type="radio" name="selectProductRadio" value="productlist" style="float: left;" ' + options["productlist"]["option"] + '>').click(function() {
            $("#changeProductViaDropdown").css("display", "block")
            $("#changeProductViaInput").css("display", "none")
        }), $("<label for=\"dataproductdropdown\">&nbsp;" + _("Select from Pre-Configured Products").t() + "</label>"),
        $('<div style="position: relative; margin-left: 8px; border: solid 1px lightslategray; width: 800px; height: 100px;' + options["productlist"]["show"] + '" id="changeProductViaDropdown">').append(
            //$('<div class="grayout" style="position: absolute; z-index: 100; ' + options["productlist"]["show"] + ' width: 100%; height: 100%; background-color: gray; opacity: 0.5;"></div>'),
            $('<div style="width: 50%; display: table-cell; padding: 5px;">' + _('Vendor').t() + ' <div id="add-data-inventory-vendor-list"></div>'),
            $('<div style="width: 50%; display: table-cell; padding: 5px;">' + _('Product').t() + ' <div id="add-data-inventory-product-list"></div>')
            
        )
    )
    if(! /^(7\.[1-9]|[8-9])/.test($C["VERSION_LABEL"])){
        existingProducts = $("<div />")
    }
    let customProduct = $('<div style=" margin-top: 8px;  display: block;  clear: both;" >')
    customProduct.append(
        $('<input id="dataproductmanually" type="radio" name="selectProductRadio" value="customentry" style="float: left;" ' + options["customentry"]["option"] + '>').click(function() {
            $("#changeProductViaDropdown").css("display", "none")
            $("#changeProductViaInput").css("display", "block")
        }), $("<label for=\"dataproductmanually\">&nbsp;" + _("Manually Specify").t() + "</label>"),
        $('<div style="position: relative; margin-left: 8px; border: solid 1px lightslategray; width: 800px; height: 45px;' + options["customentry"]["show"] + ';" id="changeProductViaInput">').append(
            //$('<div class="grayout" style="position: absolute; z-index: 100; ' + options["customentry"]["show"] + ' width: 100%; height: 100%; background-color: gray; opacity: 0.5;"></div>'),
            $('<div style="width: 50%; display: table-cell; padding: 5px;">' + _('Vendor').t() + ' <input type="text" value="' + vendorName + '" id="add-data-inventory-vendor-input" /></div>'),
            $('<div style="width: 50%; display: table-cell; padding: 5px;">' + _('Product').t() + ' <input type="text" value="' + productName + '" id="add-data-inventory-product-input" /></div>'))
    )
    let noProduct = $('<div style=" margin-top: 8px;  display: block;  clear: both;" ' + options["customentry"]["option"] + '>')
    noProduct.append(
        $('<input id="dataproductnotprovided" type="radio" name="selectProductRadio" value="notprovided" style="float: left;">').click(function() {
            $("#changeProductViaDropdown").css("display", "none")
            $("#changeProductViaInput").css("display", "none")
        }), $("<label for=\"dataproductnotprovided\">&nbsp;" + _("Do Not Specify Now").t() + "</label>") 
    )
    selectProductContainer.append(existingProducts, customProduct, noProduct)


    // Setup for Determining Coverage
    let determineCoverageContainer =  $('<div class="add-data-inventory-product-step" style="display: none;" id="data-inventory-add-determine-coverage">')
    determineCoverageContainer.append($("<p>").text(_("For most data sources, there can be gray areas for looking at what your coverage levels really are. For example, you might have Next-Gen Firewalls but only in your main offices, or you might have process launch logs but only from servers. This option allows you to specify your realistic level of coverage for this product.").t()))
    determineCoverageContainer.append($('<div id="determine-coverage-slider">'))

    // Setup for Determining Coverage
    let completeContainer =  $('<div class="add-data-inventory-product-step" style="display: none;" id="data-inventory-add-complete">').text( _("Complete!").t() )


    let indexsourcetypeContainer =  $('<div class="add-data-inventory-product-step" style="display: none;" id="data-inventory-indexes-and-sourcetypes">')
    indexsourcetypeContainer.append($("<h3>" + _("Status").t() + ":</h3>"), $('<div id="data-inventory-indexes-and-sourcetypes-status-container"></div>'))



    main.append(statusContainer, datalocationContainer, selectProductContainer, determineCoverageContainer, completeContainer, metadata_divs, determineCoverageContainer, indexsourcetypeContainer)
    

    // Now we initialize the Modal itself
    var myModal = new Modal("addProduct", {
        title: _("Add Product").t(),
        backdrop: 'static',
        keyboard: true,
        destroyOnHide: true,
        type: 'extra-wide'
    });


    $(myModal.$el).css("width", "950px").css("margin-left","-425px").css("top", "10px").on("shown.bs.modal", function() {

            let model = new BaseModel({
                selectedStep: 0
            })
            model.on("change:selectedStep", this.onSelectedStepChanged, this);
    
            model.on("change:selectedStep", function(obj, item){

                 // console.log("Going to ", item, steps[item])
                    $(".add-data-inventory-product-step").hide()
                    $("#" + steps[item]['divid']).show();
                if(item == steps.length - 1){
                    $("#data-inventory-complete-button").show()
                    let updateComplete = $.Deferred()
                    let newRecord = ProductAndKVStoreUpdate(updateComplete)
                    $.when(updateComplete).then(function(){
                        setTimeout(function(){
                            if($("div.ds_datasource_active").length){
                                if(window.original_product_id && $(".data-inventory-product[data-productid=" + window.original_product_id.replace(/([^a-zA-Z0-9\-_=\.])/g, "\\$1") + "]").length>0){
                                    updateRow($("div.ds_datasource_active").attr("id"), newRecord['productId'], data_inventory_config)
                                }else{
                                    addRow($("div.ds_datasource_active").attr("id"), newRecord['productId'], data_inventory_config)
                                }
                            }
                            huntForNewAnalyzingProducts()

                        }, 300)
                    })
                }
                setTimeout(function(){
                    validateCurrent()

                    // Stop the ability to click "next" unless the validation succeeds
                    $("#stepWizardDataInventory").find(".next-button").click(function(evt){
                        let validationResponse = validateCurrent();
                        if(validationResponse == false){
                            evt.stopPropagation();
                            return false;
                        }
                    })
                }, 100)
            })
            var WizardStep = BaseModel.extend({
                idAttribute: "value"
            })
            let wizardSteps = []
            for(let i = 0; i < steps.length; i++){
                
                // let elem = document.getElementById(steps[i].divid);
                // if(elem){
                //     //let validateEvent = new Event('validated');
                //     //elem.addEventListener('validated', function(e){}, false)
                // }
                if(i == steps.length - 1){
                    wizardSteps[i] = new WizardStep({
                        value: i,
                        label: steps[i].label,
                        enabled: !0,
                        //showNextButton:!1,
                        //showPreviousButton:!1,
                        nextLabel: _("Finish").t()
                    })
                }else{
                    wizardSteps[i] = new WizardStep({
                        value: i,
                        label: steps[i].label,
                        enabled: !0,
                        nextLabel: _("Next").t()
                    })
                }
            }
    
            let wizardStepsChild = new StepWizardControl({
                label: "",
                id: "stepWizardDataInventory",
                model: model,
                modelAttribute: "selectedStep",
                collection: new BaseCollection(wizardSteps)
            })
            wizardStepsChild.render().appendTo($(".data-inventory-add-data-status"))
            window.wizardStepsChild = wizardStepsChild;

            
            if(/^(7\.[1-9]|[8-9])/.test($C["VERSION_LABEL"])){
            
                // Then do the Data Location dropdowns
                    
                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-listIndexes") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-listIndexes")
                }
                var search2 = new SearchManager({
                    "id": "data-inventory-listIndexes",
                    "sample_ratio": null,
                    "latest_time": "now",
                    "search": "| tstats count where earliest=-1d index=* by index",
                    "earliest_time": "-3d",
                    "cancelOnUnload": true,
                    "status_buckets": 0,
                    "app": utils.getCurrentApp(),
                    "auto_cancel": 90,
                    "preview": true,
                    "tokenDependencies": {},
                    "runWhenTimeIsUndefined": false
                }, { tokens: true });
                search2.on("search:done", function(){
                    validateCurrent();
                })
                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-listSourcetypes") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-listSourcetypes")
                }
                var search3 = new SearchManager({
                    "id": "data-inventory-listSourcetypes",
                    "sample_ratio": null,
                    "latest_time": "now",
                    "search": "| metadata type=sourcetypes index=$index$",
                    "earliest_time": "-3d",
                    "cancelOnUnload": true,
                    "status_buckets": 0,
                    "app": utils.getCurrentApp(),
                    "auto_cancel": 90,
                    "preview": true,
                    "tokenDependencies": {},
                    "runWhenTimeIsUndefined": false
                }, { tokens: true });

                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-indexDropdown") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-indexDropdown")
                }
                var input1 = new DropdownInput({
                    "id": "data-inventory-indexDropdown",
                    "choices": [],
                    "valueField": "index",
                    "showClearButton": true,
                    "labelField": "index",
                    "searchWhenChanged": true,
                    "selectFirstChoice": false,
                    "value": "$form.index$",
                    "managerid": "data-inventory-listIndexes",
                    "el": $('#add-data-inventory-index-list')
                }, { tokens: true }).render();

                input1.on("change", function(newValue) {
                    FormUtils.handleValueChange(input1);
                });

                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-sourcetypeDrilldown") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-sourcetypeDrilldown")
                }
                var input2 = new DropdownInput({
                    "id": "data-inventory-sourcetypeDrilldown",
                    "choices": [],
                    "valueField": "sourcetype",
                    "showClearButton": true,
                    "labelField": "sourcetype",
                    "searchWhenChanged": true,
                    "selectFirstChoice": false,
                    "value": "$form.sourcetype$",
                    "managerid": "data-inventory-listSourcetypes",
                    "el": $('#add-data-inventory-sourcetype-list')
                }, { tokens: true }).render();

                input2.on("change", function(newValue) {
                    FormUtils.handleValueChange(input2);
                });


                // Then do the Product Type dropdowns

                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-listVendors") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-listVendors")
                }
                var search3 = new SearchManager({
                    "id": "data-inventory-listVendors",
                    "sample_ratio": null,
                    "latest_time": "now",
                    "search": "| inputlookup SSE-default-data-inventory-products.csv | inputlookup append=t data_inventory_products_lookup | stats count by vendorName | where vendorName!=\"\"",
                    "earliest_time": "-3d",
                    "cancelOnUnload": true,
                    "status_buckets": 0,
                    "app": utils.getCurrentApp(),
                    "auto_cancel": 90,
                    "preview": true,
                    "tokenDependencies": {},
                    "runWhenTimeIsUndefined": false
                }, { tokens: true });
        
                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-listProducts") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-listProducts")
                }
                var search4 = new SearchManager({
                    "id": "data-inventory-listProducts",
                    "sample_ratio": null,
                    "latest_time": "now",
                    "search": "| inputlookup SSE-default-data-inventory-products.csv | inputlookup append=t data_inventory_products_lookup | search vendorName=\"$vendorName$\" | stats count by productName | where productName!=\"\"",
                    "earliest_time": "-3d",
                    "cancelOnUnload": true,
                    "status_buckets": 0,
                    "app": utils.getCurrentApp(),
                    "auto_cancel": 90,
                    "preview": true,
                    "tokenDependencies": {},
                    "runWhenTimeIsUndefined": false
                }, { tokens: true });
        
                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-vendorDropdown") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-vendorDropdown")
                }
                var input3 = new DropdownInput({
                    "id": "data-inventory-vendorDropdown",
                    "choices": [],
                    "valueField": "vendorName",
                    "showClearButton": true,
                    "labelField": "vendorName",
                    "searchWhenChanged": true,
                    "selectFirstChoice": false,
                    "value": "$form.vendorName$",
                    "managerid": "data-inventory-listVendors",
                    "el": $('#add-data-inventory-vendor-list')
                }, { tokens: true }).render();
        
                input3.on("change", function(newValue) {
                    FormUtils.handleValueChange(input3);
                });
        
                if (typeof splunkjs.mvc.Components.getInstance("data-inventory-productsDropdown") == "object") {
                    splunkjs.mvc.Components.revokeInstance("data-inventory-productsDropdown")
                }
                var input4 = new DropdownInput({
                    "id": "data-inventory-productsDropdown",
                    "choices": [],
                    "valueField": "productName",
                    "showClearButton": true,
                    "labelField": "productName",
                    "searchWhenChanged": true,
                    "selectFirstChoice": false,
                    "value": "$form.productName$",
                    "managerid": "data-inventory-listProducts",
                    "el": $('#add-data-inventory-product-list')
                }, { tokens: true }).render();
        
                input4.on("change", function(newValue) {
                    FormUtils.handleValueChange(input4);
                });
            }


            splunkjs.mvc.Components.getInstance("submitted").on("change", function(){
                validateCurrent()
            })
            $("div#addProduct").find("input").on("change keypress", function(){
                setTimeout(function(){
                    validateCurrent()
                }, 100)
            })
            $(".modal").find("input[type=radio]").on("change keypress", function(evt){
                 // console.log("Got a setting change", $(evt.target).attr("name"), $(evt.target).attr("value") )
                setTimeout(function(){
                    validateCurrent()
                }, 100)
            })

            $(".modal").find("textarea").on("change keypress", function(evt){
                 // console.log("Got a setting change", $(evt.target).attr("name"), $(evt.target).attr("value") )
                setTimeout(function(){
                    validateCurrent()
                }, 100)
            })

            // Run the Term Validation process once the data location is set
            $("#data-inventory-add-data-location").on("validated", function(evt){
                let DataLocationSetting = $("#data-inventory-add-data-location").find("input[type=radio]:checked").val()
                let editButton = $('<div class="data-inventory-edit-button"></div>').append( $('<a href="#">Edit <i class="icon-pencil" /></a>').click(function(){

                    // Now we initialize the Modal itself
                    var myModal = new Modal("editTERMSearch", {
                        title: _("Edit Index+Sourcetype Search").t(),
                        backdrop: 'static',
                        keyboard: true,
                        destroyOnHide: true,
                        type: 'wide'
                    });

                    myModal.body.html( "<p>" + _("<i>Warning:</i> Not for first time Splunk users!<br />Splunk Security Essentials has introduced a Data Availability dashboard, but in order to realistically analyze all of your data quickly, we need to have lightning-fast searches. In order to do this, we use the tstats search command, which is much more limited in what it's able to search than traditional Splunk search. To ensure that your searches are safe, this dashboard will only accept three types of search filters (just for this super-fast search!):").t() + "<ul><li>index=yourindex</li><li>sourcetype=yoursourcetype</li><li>TERM(yourterm) <a href=\"https://docs.splunk.com/Documentation/Splunk/7.2.0/Search/UseCASEandTERMtomatchphrases\" target=\"_blank\" class=\"external drilldown-link\"></a></li></ul></p>" ).append($('<div id="warnings-for-term-search-details">'), $('<textarea id="term-search-details" style="width: 100%; height: 50px;"></textarea>').text($("#data-inventory-indexes-and-sourcetypes").attr("data-termsearch")) )

                    myModal.footer.append($('<button>').attr({
                        type: 'button',
                        'data-dismiss': 'modal'                        
                    }).addClass('btn').text( _('Cancel').t() ).on('click', function() {
                        
                    }),$('<button>').attr({
                        type: 'button'
                    }).addClass('btn btn-primary').text( _('Close').t() ).on('click', function() {
                        let stringForValidation = $("#term-search-details").val().replace(/[\(\)]/g, "");
                        let terms = stringForValidation.split(/\s/);
                        let totalTerms = 0;
                        let termableTerms = 0;
                        for(let i = 0; i < terms.length; i++){
                            let term = terms[i]
                            if(term != ""){
                                totalTerms++;
                                if(term.match(/index=/) && term.replace("index=", "").replace(/[\*\s]/g, "").length > 1){
                                    //let index = term.match(/index=(\S+)/)[1];
                                    termableTerms++;
                                }else if(term.match(/sourcetype=(\S+)/)){
                                    //let sourcetype = term.match(/sourcetype=(\S+)/)[1];
                                    termableTerms++;
                                }else if(/^TERM\S*$/.test(term)){
                                    termableTerms++;
                                }
                            }
                        }
                        if(totalTerms == termableTerms){
                            $("#data-inventory-indexes-and-sourcetypes").attr("data-termsearch", $("#term-search-details").val())
                            $("#data-inventory-indexes-and-sourcetypes-status-container").find("pre").text($("#term-search-details").val())
                            $("#editTERMSearch").modal("hide")
                        }else{
                            $("#warnings-for-term-search-details").html( _('<span style="color: red; font-weight: bold;">Error -- our validation checker found terms not present in the list above.</span> If you believe this to be in error, please <a href=\"mailto:sse@splunk.com\">let us know</a>, and if you\'re really confident in your knowledge of what will work in a | tstats search, you can edit data_inventory_products_lookup manually via the lookup editor app.').t() ) 
                        }
                        //#warnings-for-term-search-details
                    }))
                    myModal.show(); // Launch it!
                    
                }) )
                let gatherDiv = $("#data-inventory-indexes-and-sourcetypes")
                gatherDiv.attr("data-was-validated", "pending");
                gatherDiv.removeAttr("data-termsearch", "");
                gatherDiv.attr("show-edit", "true")
                let statusDiv = $("#data-inventory-indexes-and-sourcetypes-status-container");
                 // console.log("Got a setting", DataLocationSetting)
                if(DataLocationSetting == "future"){
                    gatherDiv.attr("data-was-validated", "success");
                    gatherDiv.attr("data-termsearch", "");
                    gatherDiv.attr("show-edit", "false")
                    statusDiv.html(_("No sourcetypes or indexes needed for future data sources.").t())
                }else if(DataLocationSetting == "manual"){
                    gatherDiv.attr("data-was-validated", "success");
                    gatherDiv.attr("data-termsearch", "");
                    gatherDiv.attr("show-edit", "false")
                    statusDiv.html(_("Without specifying the SPL, we can't gather the sourcetypes or indexes used for this product. This means that the Data Availability Dashboard won't work. You can always come back and edit this product to add the SPL later.").t())
                }else if(DataLocationSetting == "dropdown"){
                    if(
                        splunkjs.mvc.Components.getInstance("submitted").toJSON()['index'] && 
                        splunkjs.mvc.Components.getInstance("submitted").toJSON()['index']!="" &&
                        splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype'] && 
                        splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype']!=""
                        ){
                            gatherDiv.attr("data-was-validated", "success");
                            gatherDiv.attr("data-termsearch", "(index=" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['index'] + " sourcetype=" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype'] + ")");
                            statusDiv.html($("<div>Validation success, received:</div>").append($("<pre>").text("(index=" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['index'] + " sourcetype=" + splunkjs.mvc.Components.getInstance("submitted").toJSON()['sourcetype'] + ")") ) )
                            
                    }else{
                        
                        gatherDiv.attr("data-was-validated", "success");
                        gatherDiv.attr("data-termsearch", "");
                        statusDiv.html("Error occurred while validating. It appears that the data location is not set correctly (step one). We were not able to collect the indexes and sourcetypes that will be used for the Data Availability Dashboard, but you can continue with the rest of the app. If this seems to be in error, please reach out for assistance via Splunk Answers.")
                    }
                }else if(DataLocationSetting == "box"){
                    let definedSearch = $("#changeBaseViaBox").find("textarea").val().replace(/[\(\)]/g, "");
                    let terms = definedSearch.split(/\s+/);
                    let totalTerms = 0;
                    let termableTerms = 0;
                    for(let i = 0; i < terms.length; i++){
                        let term = terms[i]
                        if(term != ""){
                            totalTerms++;
                            if(term.match(/index=/) && term.replace("index=", "").replace(/[\*\s]/g, "").length > 1){
                                //let index = term.match(/index=(\S+)/)[1];
                                termableTerms++;
                            }else if(term.match(/sourcetype=(\**[^\*\s]+\**)/)){
                                //let sourcetype = term.match(/sourcetype=(\S+)/)[1];
                                termableTerms++;
                            }else if(/^TERM\S*$/.test(term)){
                                termableTerms++;
                            }
                        }
                    }
                     // console.log("Search Parser, we got", terms, totalTerms, termableTerms)
                    if(termableTerms == totalTerms){
                        gatherDiv.attr("data-was-validated", "success");
                        gatherDiv.attr("data-termsearch", $("#changeBaseViaBox").find("textarea").val());
                        statusDiv.html($("<div>Validation success, received:</div>").append($("<pre>").text($("#changeBaseViaBox").find("textarea").val()) ) )
                    }else{

                        // logic to check if the actual search is complete.
                        statusDiv.html($("<div>Validation search in progress:</div>") ).append($('<div style="width: 400px; height: 20px; border: 1px solid gray;">').append('<div style="width: 0px; height: 20px; background-color: gray" id="gather-sourcetypes-progress-bar"/>') )

                        if (typeof splunkjs.mvc.Components.getInstance("data-inventory-gather-sourcetypes") == "object") {
                            splunkjs.mvc.Components.revokeInstance("data-inventory-gather-sourcetypes")
                        }
                        var search2 = new SearchManager({
                            "id": "data-inventory-gather-sourcetypes",
                            "sample_ratio": null,
                            "latest_time": "now",
                            "search": $("#changeBaseViaBox").find("textarea").val() + " | head 100000 | stats count by sourcetype, index | eval base=\"(index=\" . index . \" sourcetype=\" . sourcetype . \")\" | stats values(base) as base | eval base=\"(\" . mvjoin(base, \" OR \") . \")\"",
                            "earliest_time": "-1d",
                            "cancelOnUnload": true,
                            "status_buckets": 0,
                            "app": utils.getCurrentApp(),
                            "auto_cancel": 90,
                            "preview": true,
                            "tokenDependencies": {},
                            "runWhenTimeIsUndefined": false
                        }, { tokens: true });
                        search2.on("search:progress", function(properties) {
                            // Print just the event count from the search job
                            $("#gather-sourcetypes-progress-bar").css("width", Math.min((properties.content.eventCount / 100000) * 400, 400) )
                            
                        });
                        search2.on("search:done", function(properties) {
                            let sid = properties.content.request.label
                            if (properties.content.resultCount == 0) {
                                gatherDiv.attr("data-was-validated", "success");
                                gatherDiv.attr("data-termsearch", "");
                                statusDiv.html($("<div>Validation failed -- didn't see any index or sourcetype in the data. You can continue and revisit this page later, or provide an index + sourcetype mapping manually later through the lookup editor app.</div>") )
                            } else {
                                let results = splunkjs.mvc.Components.getInstance(sid).data('results', { output_mode: 'json', count: 0 });
                                results.on("data", function(properties) {
                                    let sid = properties.attributes.manager.id
                                    let data = properties.data().results
                                    if (data && data.length && data.length >= 1 && data[0].base && data[0].base != "") {
                                        gatherDiv.attr("data-was-validated", "success");
                                        gatherDiv.attr("data-termsearch", $("#changeBaseViaBox").find("textarea").val());
                                        statusDiv.html($("<div>Validation success, received:</div>").append($("<pre>").text(data[0].base) ) )
                                    } else {
                                        gatherDiv.attr("data-was-validated", "success");
                                        gatherDiv.attr("data-termsearch", "");
                                        statusDiv.html($("<div>Validation failed -- didn't see any index or sourcetype in the data. You can continue and revisit this page later, or provide an index + sourcetype mapping manually later through the lookup editor app.</div>") )
                                    }
                                })
                            }
                        });
                        
                    }
                }else{
        

                }
                $(".data-inventory-edit-button").remove()
                if(gatherDiv.attr("show-edit") == "true"){
                    gatherDiv.append(editButton)
                }
                

            })


            if(product['coverage_level'] && product['coverage_level'] != "" && product['coverage_level']>=0){
                 // console.log("Showing Slider w/ coverage level of ", product['coverage_level'])
                $("#determine-coverage-slider").append(generateSlider(product['coverage_level']))
            }else{
                 // console.log("Showing Slider w/o coverage level")
                $("#determine-coverage-slider").append(generateSlider())
            }

            // Stop the ability to click "next" unless the validation succeeds on the first load (e.g., for the initial step). This same code is in the on(step:change) or something like that event
            $("#stepWizardDataInventory").find(".next-button").click(function(evt){
                let validationResponse = validateCurrent();
                if(validationResponse == false){
                    evt.stopPropagation();
                    return false;
                }
            })


        
    })
    myModal.body.css("max-height", "calc(100vh - 210px)").html(main)

    myModal.footer.append($('<button>').attr({
        type: 'button',
        'data-dismiss': 'modal'
    }).addClass('btn ').text( _('Cancel').t()).on('click', function() {
        // Not taking any action here
    }), $('<button>').attr({
        type: 'button',
        'data-dismiss': 'modal'
    }).addClass('btn btn-primary').css("display", "none").attr("id", "data-inventory-complete-button").text(_('Complete').t()).on('click', function() {
        window.huntForNewAnalyzingProducts()
        // Not taking any action here
    }))
    myModal.show(); // Launch it!



    // Once Modal is Loaded

})

}

function handleKVStoreProductRemoval(eventtypeId, productId){
    // Check if original_product_id already exists
        // if it does, check if there are other eventtypeIds
            // if there are, update it to remove this eventtypeId
            // if there aren't, remove the eventtypeId
    $.ajax({
        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/?query={"_key": "' + productId + '"}',
        type: 'GET',
        contentType: "application/json",
        async: true,
        success: function(returneddata) {
            // console.log("Got a return from the data thing", returneddata)
            if (returneddata.length > 0) {
                returneddata = returneddata[0]
                // console.log("Update b")
                let eventtypeIds = returneddata.eventtypeId.split("|");
                if(eventtypeId == "global" || (eventtypeIds.length == 1 && eventtypeIds.indexOf( eventtypeId ) >=0)){

                    notifyIntroElementsOfProductDelete(productId);
                    $.ajax({
                        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + productId,
                        type: 'DELETE',
                        async: true,
                        success: function(){bustCache(); }
                    })
                    for(let i = 0; i < window.data_inventory_products.length; i++){
                        if(window.data_inventory_products[i].productId == productId){
                            window.data_inventory_products.splice(i, 1); 
                            break;
                        }
                    }
                }else{
                    // console.log("Update c")
                    eventtypeIds.splice( eventtypeIds.indexOf( eventtypeId ), 1)
                    returneddata.eventtypeId = eventtypeIds.join("|")
                    notifyIntroElementsOfProductChange(returneddata);
                    $.ajax({
                        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + productId,
                        type: 'POST',
                        contentType: "application/json",
                        async: true,
                        data: JSON.stringify(returneddata),
                        success: function(returneddata) {bustCache(); newkey = returneddata },
                        error: function(xhr, textStatus, error) {
                            //              console.log("Error Updating!", xhr, textStatus, error)
                        }
                    })
                    for(let i = 0; i < window.data_inventory_products.length; i++){
                        if(window.data_inventory_products[i].productId == productId){
                            window.data_inventory_products[i] = returneddata;
                            break;
                        }
                    }
                }
            }
        },
        error: function(error, data, other) {
                 // console.log("Error Code!", error, data, other)
        }
    })
}

function handleNewKVStoreProductUpdate(record, updateComplete){
    // console.log("Got a request for", window.original_product_id, record);
    // console.log("Update __")
    if(window.original_product_id && window.original_product_id != record["productId"]){
        // console.log("Update a", window.original_product_id)
        //handleKVStoreProductRemoval($(".ds_datasource_active").attr("id"), window.original_product_id) // switching this to global to try to avoid the "only partial fix" found during Beta #1
        handleKVStoreProductRemoval("global", window.original_product_id)
    }

    $.ajax({
        url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/?query={"_key": "' + record['_key'] + '"}',
        type: 'GET',
        contentType: "application/json",
        async: true,
        success: function(returneddata) {
            if (returneddata.length == 0) {
                // New
                // console.log("Update f")
                notifyIntroElementsOfProductChange(record);
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/',
                    type: 'POST',
                    contentType: "application/json",
                    async: true,
                    data: JSON.stringify(record),
                    success: function(returneddata) {bustCache(); newkey = returneddata },
                    error: function(xhr, textStatus, error) {
                    }
                })
                window.data_inventory_products.push(record)
                window.reportTelemetry(record.productId)
                updateComplete.resolve()
            } else {
                returneddata = returneddata[0]
                // console.log("Looking at", returneddata, record)
                let finalProduct = updateOrMergeProducts(returneddata, record, true);
                let forcedFinalProduct = false
                if(window.original_product_id && window.original_product_id == record["productId"]){
                    finalProduct = record;
                    forcedFinalProduct = true
                }
                
                // console.log("Got my final log",forcedFinalProduct, finalProduct)
                for(let i = 0; i < window.data_inventory_products.length; i++){
                    if(window.data_inventory_products[i].productId == finalProduct["_key"]){
                        window.data_inventory_products[i] = finalProduct;
                        window.reportTelemetry(finalProduct.productId)
                        break;
                    }
                }
                notifyIntroElementsOfProductChange(finalProduct);
                $.ajax({
                    url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + finalProduct['_key'],
                    type: 'POST',
                    contentType: "application/json",
                    async: true,
                    data: JSON.stringify(finalProduct),
                    success: function(returneddata) { bustCache();newkey = returneddata },
                    error: function(xhr, textStatus, error) {
                    }
                })
                updateComplete.resolve()
            }
        },
        error: function(error, data, other) {
        }
    })
}

window.createTable = createTable
window.addRow = addRow
window.addOrEditModal = addOrEditModal
function areSearchesTheSame(search1, search2){
    return search1.replace(/\(\)"/g, "") == search2.replace(/\(\)"/g, "")
}
function isThisProductUsed(product){
    if(product.stage && product.stage != "step-sourcetype" && product.stage != "step-cim"){
        // console.log("I have decided that this product is used", product.stage, product.productId, product)
        return true;
    }
    // console.log("I have decided that this product is not used", product.stage, product.productId, product)
    return false;
}
window.isThisProductUsed = isThisProductUsed
function updateOrMergeProducts(older, newer, forceOlderSearchString){
    // double check this is a valid scenario
    if(older.productId != newer.productId){
        triggerError("Application Error! Called updateOrMergeProducts for products with different productIds. This should not happen.")
        return null;
    }
    let keyFieldsToRetain = ["blocked-by"]
    // first check if the older one is garbage
    if(! isThisProductUsed(older)){
        for(let i = 0; i < keyFieldsToRetain.length; i++){
            if(older[keyFieldsToRetain[i]] && ! newer[keyFieldsToRetain[i]]){
                newer[keyFieldsToRetain[i]] = older[keyFieldsToRetain[i]]
            }
        }
        newer['internal_note'] = "detected that older was not used"
        return newer;
    }
    // then check if the newer one is garbage
    if(! isThisProductUsed(newer)){
        for(let i = 0; i < keyFieldsToRetain.length; i++){
            if(newer[keyFieldsToRetain[i]] && ! older[keyFieldsToRetain[i]]){
                older[keyFieldsToRetain[i]] = newer[keyFieldsToRetain[i]]
            }
        }
        older['internal_note'] = "detected that newer was not used"
        return older;
    }
    if(older['internal_note']){
        delete older['internal_note']
    }
    
    if(newer['internal_note']){
        delete newer['internal_note']
    }
    
    // then combine eventtypeIds
    if(older.eventtypeIds != newer.eventtypeIds){
        let olderET = older.eventtypeIds.split("|");
        let newerET = newer.eventtypeIds.split("|");
        let combinedETs = olderET.concat(newerET)
        combinedETs = combinedETs.filter(function (item, pos) {return combinedETs.indexOf(item) == pos});
        older.eventtypeIds = combinedETs.join("|")
    }

    // then combine metadata_json
    if(! older["metadata_json"] || older["metadata_json"] == ""){
        if(newer["metadata_json"] && newer["metadata_json"] != ""){
            older["metadata_json"] = newer["metadata_json"]
        }
    }else if(! newer["metadata_json"] || newer["metadata_json"] == ""){
        // Everything is okay
    }else{
        try{
            let olderMD = JSON.parse(older["metadata_json"])
            let newerMD = JSON.parse(newer["metadata_json"])
            let handledObjs = []
            for(let obj in olderMD){
                if(! olderMD[obj] || olderMD[obj] == ""){
                    if(newerMD[obj] && newerMD[obj] != ""){
                        olderMD[obj] = newerMD[obj]
                    }
                }else if(! newerMD[obj] || newerMD[obj] == ""){
                    // Everything is okay
                }else{
                    olderMD[obj] = olderMD[obj] + "\n**Merged**\n" + newerMD[obj]
                }
                handledObjs.push(obj)
            }
            for(let obj in newerMD){
                if(handledObjs.indexOf(obj) == -1){
                    if(! olderMD[obj] || olderMD[obj] == ""){
                        if(newerMD[obj] && newerMD[obj] != ""){
                            olderMD[obj] = newerMD[obj]
                        }
                    }else if(! newerMD[obj] || newerMD[obj] == ""){
                        // Everything is okay
                    }else{
                        olderMD[obj] = olderMD[obj] + "\n**Merged**\n" + newerMD[obj]
                    }
                    handledObjs.push(obj)
                }
            }
        }catch(error){}
        
    }

    // then combine search strings (basesearch, termsearch)
    let metadataWinner = "";
    if(newer.basesearch != older.basesearch){
        if(typeof forceOlderSearchString != "undefined" && forceOlderSearchString){
            // console.log("BLAHBLAH 0", metadataWinner, older.basesearch, newer.basesearch)
            metadataWinner = "new"
            older.basesearch = newer.basesearch
        }else if(!older.basesearch || older.basesearch == ""){
            older.basesearch = newer.basesearch
            metadataWinner = "new"
            // console.log("BLAHBLAH 1", metadataWinner, older.basesearch, newer.basesearch)
        } else if(!newer.basesearch || newer.basesearch == ""){
            // all is okay
            metadataWinner = "old"
            // console.log("BLAHBLAH 2", metadataWinner, older.basesearch, newer.basesearch) 
        }else{

            let newer_provided_search_no_parens = newer.basesearch.replace(/"/g, "").replace(/^\(/, "").replace(/\)$/, "")
            let newer_provided_search_parens = "(" + newer.basesearch.replace(/"/g, "").replace(/^\(/, "").replace(/\)$/, "") + ")"
            let older_provided_search_no_parens = older.basesearch.replace(/"/g, "").replace(/^\(/, "").replace(/\)$/, "")
            let older_provided_search_parens = "(" + older.basesearch.replace(/"/g, "").replace(/^\(/, "").replace(/\)$/, "") + ")"
            if(older.basesearch &&
                ( older.basesearch.replace(/"/g, "") == newer_provided_search_no_parens.replace(/"/g, "") 
                    ||  older.basesearch.replace(/"/g, "") == newer_provided_search_parens.replace(/"/g, "") 
                || older.basesearch.replace(/"/g, "").indexOf(newer_provided_search_parens.replace(/"/g, "")) >= 0 ) ){
                    // The older search contains the newer search 
                    metadataWinner = "old"
                    // console.log("BLAHBLAH 3", metadataWinner, older.basesearch, newer.basesearch)
            } else if(newer.basesearch &&
                ( newer.basesearch.replace(/"/g, "") == older_provided_search_no_parens.replace(/"/g, "") 
                    ||  newer.basesearch.replace(/"/g, "") == older_provided_search_parens.replace(/"/g, "") 
                || newer.basesearch.replace(/"/g, "").indexOf(older_provided_search_parens.replace(/"/g, "")) >= 0 ) ){
                    // The newer search contains the older search 
                    older.basesearch = newer.basesearch
                    metadataWinner = "new"
                    // console.log("BLAHBLAH 4", metadataWinner, older.basesearch, newer.basesearch)
            } else {
                older.basesearch = older_provided_search_parens + " OR " + newer_provided_search_parens
                metadataWinner = "reset"
                // console.log("BLAHBLAH 5", metadataWinner, older.basesearch, newer.basesearch)
            }

        }
    }

    // then handle "created_time", "updated_time",
    older["updated_time"] = Math.round(Date.now() / 1000);
    if(parseInt(older["created_time"]) > parseInt(newer["created_time"])){
        older["created_time"] = newer["created_time"]
    }

    // then handle the other metadata stuff and the status
    let metadataFields = ["stage", "status", "coverage_level", "cim_detail", "eventsize", "cim_compliant_fields", "daily_event_volume", "daily_host_volume", "desired_sampling_ratio"]
    if(metadataWinner = "reset"){
        for(let i = 0; i < metadataFields.length; i++){
            older[metadataFields[i]] = ""
        }
        older["status"] = "analyzing"
        older["stage"] = "step-eventsize"
    } else if(metadataWinner == "old"){
        for(let i = 0; i < metadataFields.length; i++){
            if(older[metadataFields[i]] && older[metadataFields[i]] != ""){
                // everything's fine, we're going to return older at the end
            }else if(newer[metadataFields[i]] && newer[metadataFields[i]] != ""){
                older[metadataFields[i]] = newer[metadataFields[i]]
            }else{
                older[metadataFields[i]] = ""
            }
        }
    } else if(metadataWinner == "new"){
        for(let i = 0; i < metadataFields.length; i++){
            if(newer[metadataFields[i]] && newer[metadataFields[i]] != ""){
                older[metadataFields[i]] = newer[metadataFields[i]]
            }else if(older[metadataFields[i]] && older[metadataFields[i]] != ""){
                // No change
            }else{
                older[metadataFields[i]] = ""
            }
        }
    } 

    return older;
}
function handleExistingProductClick(obj){
     // console.log("Got a click", arguments);
    if($(obj).attr("class").indexOf("active") >= 0){
        $(obj).removeClass("active")
        $(obj).closest("div").removeClass("active")
        $("#data-inventory-addorexisting-decision").hide().unbind("click")
    }else{
        $(obj).addClass("active")
        let key = $(obj).attr("data-key")
        $(obj).closest("div").addClass("active")
        $("#data-inventory-addorexisting-decision").show().click(function(){
            $.ajax({
                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/?query={"_key": "' + key + '"}',
                type: 'GET',
                contentType: "application/json",
                async: true,
                success: function(returneddata) {
                    if (returneddata.length == 1) {
                        returneddata = returneddata[0]
                        let eventtypeIds = returneddata.eventtypeId.split("|");
                        if(eventtypeIds.indexOf($(".ds_datasource_active").attr("id")) == -1){
                            eventtypeIds.push( $(".ds_datasource_active").attr("id") );

                            returneddata.eventtypeId = eventtypeIds.join("|")
                            notifyIntroElementsOfProductChange(returneddata);
                            $.ajax({
                                url: $C['SPLUNKD_PATH'] + '/servicesNS/nobody/Splunk_Security_Essentials/storage/collections/data/data_inventory_products/' + returneddata['_key'],
                                type: 'POST',
                                contentType: "application/json",
                                async: true,
                                data: JSON.stringify(returneddata),
                                success: function() { 
                                    bustCache();
                                    for(let i = 0; i < window.data_inventory_products.length; i++){
                                        if(returneddata.productId == window.data_inventory_products[i].productId){
                                            window.data_inventory_products[i] = returneddata
                                        }
                                    }
                                    $("#chooseExistingProduct").modal("hide");
                                    
                                    require(["underscore", 
                                    "jquery", 
                                    'app/Splunk_Security_Essentials/components/controls/Modal',
                                    'json!' + $C['SPLUNKD_PATH'] + '/services/pullCSV?config=data-inventory-config'],
                                    function(_, 
                                        $, 
                                        Modal, data_inventory_config){ 
                                            addRow($(".ds_datasource_active").attr("id"), returneddata.productId, data_inventory_config)
                                            
                                            
                                        // Now we initialize the Modal itself
                                        var myModal = new Modal("existingProductSuccess", {
                                            title: _("Successfully Added").t(),
                                            backdrop: 'static',
                                            keyboard: true,
                                            destroyOnHide: true,
                                            type: 'wide'
                                        });

                                        myModal.body.html($("<p>" + _("Success!").t() + "</p>"))

                                        myModal.footer.append($('<button>').attr({
                                            type: 'button',
                                            'data-dismiss': 'modal'
                                        }).addClass('btn btn-primary').text( _('Close').t() ).on('click', function() {
                                            // Not taking any action here
                                        }))
                                        myModal.show(); // Launch it!
                                        })
                                },
                                error: function(xhr, textStatus, error) {
                                    //              console.log("Error Updating!", xhr, textStatus, error)
                                }
                            })
                        }else{

                            require(["underscore", 
                            "jquery", 
                            'app/Splunk_Security_Essentials/components/controls/Modal'],
                            function(_, 
                                $, 
                                Modal){ 

                                // Now we initialize the Modal itself
                                var myModal = new Modal("existingProductNotNeeded", {
                                    title: _("Already Present").t(),
                                    backdrop: 'static',
                                    keyboard: true,
                                    destroyOnHide: true,
                                    type: 'wide'
                                });

                                myModal.body.html($("<p>Not added -- this data source category is already added.</p>"))

                                myModal.footer.append($('<button>').attr({
                                    type: 'button',
                                    'data-dismiss': 'modal'
                                }).addClass('btn btn-primary').text('Close').on('click', function() {
                                    // Not taking any action here
                                }))
                                myModal.show(); // Launch it!
                            })
                        }
                    }
                }
            })
        })
    }
}

function ProductAndVendorToProductId(vendorName, productName){
    return vendorName.replace(/ /g, "_").replace(/[^a-zA-Z_0-9\-\_]/g, "") + "__" + productName.replace(/ /g, "_").replace(/[^a-zA-Z_0-9\-\_]/g, "");
}

function ExistingOrNewProductModal(){

    require(["underscore", 
    "jquery", 
    'app/Splunk_Security_Essentials/components/controls/Modal'],
    function(_, 
        $, 
        Modal){ 
            if(window.data_inventory_products.filter(function(item){ return item.stage != "step-sourcetype"}).length == 0){
                addOrEditModal();
            }else{

                
    let products = JSON.parse(JSON.stringify(window.data_inventory_products));
    
    products.sort(function(a, b){
        if(a.vendorName > b.vendorName){
            return 1;
        }
        if(a.vendorName < b.vendorName){
            return -1;
        }
        if(a.productName > b.productName){
            return 1;
        }
        if(a.productName < b.productName){
            return -1;
        }
        return 0;
    })
    // Now we initialize the Modal itself
    var myModal = new Modal("chooseExistingProduct", {
        title: _("Choose Existing Product").t(),
        backdrop: 'static',
        keyboard: true,
        destroyOnHide: true,
        type: 'wide'
    });

    $(myModal.$el).on("shown.bs.modal", function() {
    })
    let main = $("<div>")
    main.append($("<div>").addClass("modal-main-option").text("Add New Product").click(function(obj){
        if($(obj.target).attr("class").indexOf("active") >= 0){
            $(obj.target).removeClass("active")
            $("#data-inventory-addorexisting-decision").hide().unbind("click")
        }else{
            $(obj.target).addClass("active")
            
            $("#data-inventory-addorexisting-decision").show().click(function(){
                addOrEditModal();
            }).click()
        }
    }))
    let listOfProducts = $("<div>").addClass("modal-main-option").text( _("Assign Existing Product").t() )
    let table = $('<table class="table"><thead><tr><th>' + _('Vendor Name').t() + '</th><th>' + _("Product Name").t() + '</th><th>' + _('Data Source Categories Already Mapped To').t() + '</th></tr></thead><tbody></tbody></table>');
    for(let i = 0; i < products.length; i++){
        if(products[i]["vendorName"] && products[i]["vendorName"]!="" && products[i]["productName"] && products[i]["productName"]!="" && products[i]["status"] && (dataProductStatusNames[ products[i]["status"] ] ||  (window.data_inventory_products[i].status == "pending" && stagesWithValidPendingStatus[window.data_inventory_products[i].stage]) )){

            let key = ProductAndVendorToProductId(products[i]["vendorName"], products[i]["productName"])
            let row = $("<tr>").attr("data-key", key).addClass("data-inventory-existing-product").click(function(){handleExistingProductClick(this)});
    
            row.append($("<td>").append( 
                $("<span>").text(products[i].vendorName))   
                )
            row.append($("<td>").append( $("<span>").text(products[i].productName)      ))
            let eventtypeIds = products[i].eventtypeId.split("|")
            let eventtypeTD = $("<td>")
            for(let g = 0; g < eventtypeIds.length; g++){
                if(g != 0){
                    eventtypeTD.append("<br/>")
                }
                let label = eventtypeIds[g]
                if(eventtype_to_label[eventtypeIds[g]]){
                    label = eventtype_to_label[eventtypeIds[g]]
                }
                eventtypeTD.append($("<span>").text(label))
            }
            row.append(eventtypeTD)
             // console.log("Single Row", row.html())
            table.find("tbody").first().append(row)
        }
    }
    listOfProducts.append(table)
    main.append(listOfProducts)
    myModal.body.html(main)

    myModal.footer.append($('<button>').attr({
        type: 'button',
        'data-dismiss': 'modal'
    }).addClass('btn ').text( _('Cancel').t() ).on('click', function() {
        // Not taking any action here
    }), $('<button>').attr({
        type: 'button',
        'data-dismiss': 'modal'
    }).addClass('btn btn-primary').css("display", "none").attr("id", "data-inventory-addorexisting-decision").text(_('Next').t()).on('click', function() {
        // Not taking any action here
    }))
    myModal.show(); // Launch it!

    
            }
        })

}