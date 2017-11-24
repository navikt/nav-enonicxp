function changeSelectedNavUnitOrg()
{
 $("#navUnitOrgSelectedChangeButton").hide();
 $("#navUnitOrgSelected").text('');
 $("#navUnitOrgSelected").hide();
 $("#navUnitOrg").val('');
 $("#navUnitOrg").show();
}

function changeSelectedNavUnitMultiple()
{
 $("#navUnitMultipleSelectedChangeButton").hide();
 $("#navUnitMultipleSelected").text('');
 $("#navUnitMultipleSelected").hide();
 $("#navUnitMultiple").val('');
 $("#navUnitMultiple").show();
}

function changenavdepartment1()
{
 $("#navdepartment1SelectedChangeButton").hide();
 $("#navdepartment1Selected").text('');
 $("#navdepartment1Selected").hide();
 $("#navdepartment1").val('');
 $("#navdepartment1").show();
}

function changeexcaseNAVKontor()
{
 $("#excaseNAVKontorSelectedChangeButton").hide();
 $("#excaseNAVKontorSelected").text('');
 $("#excaseNAVKontorSelected").hide();
 $("#excaseNAVKontor").val('');
 $("#excaseNAVKontor").show();
}

function showAddressChoices()
{
        var chosenSenderSituation = $(".chooseSenderSituation:checked");
        var address =  chosenSenderSituation.parents("div.userinputsection");
        var moreaddressoptions = address.find(".moreaddressoptions");
        var siblings =  chosenSenderSituation.parents('.NAVskjemaIndre').siblings();  
       
       moreaddressoptions.show(); 
       moreaddressoptions.slideDown('fast');
       var chosenAddressSituation = $(".velgAdrSituation:checked");
       var addressinfo = chosenAddressSituation.parents("div.addressInfo");
       var addressinputbody = addressinfo.find(".addressinputbody");
       addressinputbody.show();
       addressinputbody.slideDown();
       var siblings = addressinfo.siblings();
       siblings.find(".addressinputbody").slideUp();
       
        if (! $(chosenSenderSituation).parents('.NAVskjemaIndre').hasClass('checked')) {
            $(chosenSenderSituation).parents('.NAVskjemaIndre').addClass('checked');
            $(chosenSenderSituation).parents('.NAVskjemaIndre').siblings().removeClass('checked');
            return true;
        } 
}

$(document).ready(function() {
   
    finnAdresseInit();
  
    
}); // jquery document ready end

