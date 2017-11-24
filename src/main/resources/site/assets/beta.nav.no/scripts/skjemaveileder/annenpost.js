var mottakerEnheter = null;
var validinput = true;
var validfnr = false;
var validcategory = false;

function goToChooseCategory() {
    $("#chooseCategory").show();
    hideNotChosenVariables();
    setsenderChosenVariables();
    $("#senderChosen").show();
    $("#skjema2011userDetails").hide();
    $("#attachmentDownload").hide();
    $("#previousStepButton").hide();
    $("#categoryChosen").hide();
}

function goToChooseSender() {
    validcategory = false;
    validateCategory();
    if (validcategory == true) {
        $("#chooseCategory").hide();
        $("#previousStepButton").show();
        $("#senderChosen").hide();
        $("#skjema2011userDetails").show();
        $("#attachmentDownload").hide();
        $(".categoryChosen").text($("#chooseCategorySelect option:selected").text());
        $("#categoryChosen").show();
        if ($("input[name='klage']").val() == 'true') {
            $('#addressMainstep3 .moreaddressoptions').show();
            $('#innorwayfnr').focus();
        }
    }
}


  // Autocomplete
    if ($('input.excase').is(':checked')) {
        $(this).parents('.definerelation').siblings('div.navdepartment').show();
    }
	
	
function goToDownload() {
if ((($("input[name='situation']:checked").val()) == undefined) && (($("input[name='chooseSenderSituation']:checked").val()) == undefined)) {
$("#notChosenAnySituationError").show();
} else {
clearErrorMessages();
validinput = true;
validfnr = false;
validateFindAddress();
validateFields();
}
if ((validinput == true) && (validfnr == true)) {
$("#chooseCategory").hide();
$("#senderChosen").show();
$("#skjema2011userDetails").hide();
$("#attachmentDownload").show();
$("#categoryChosen").show();
hideNotChosenVariables();
setsenderChosenVariables();
}
} 
function hideNotChosenVariables() {
    if ($("input[name='situation']:checked").val() == undefined) {
        $("#alt1chosen").hide();
        $("#alt2chosen").hide();
        $("#alt3chosen").hide();
        $("#alt4chosen").hide();
        $("#alt5chosen").hide();
        $("#alt6chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt1') {
        $("#alt1chosen").show();
        $("#alt2chosen").hide();
        $("#alt3chosen").hide();
        $("#alt4chosen").hide();
        $("#alt5chosen").hide();
        $("#alt6chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt2') {
        $("#alt2chosen").show();
        $("#alt1chosen").hide();
        $("#alt3chosen").hide();
        $("#alt4chosen").hide();
        $("#alt5chosen").hide();
        $("#alt6chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt3') {
        $("#alt3chosen").show();
        $("#alt1chosen").hide();
        $("#alt2chosen").hide();
        $("#alt4chosen").hide();
        $("#alt5chosen").hide();
        $("#alt6chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt4') {
        $("#alt4chosen").show();
        $("#alt1chosen").hide();
        $("#alt2chosen").hide();
        $("#alt3chosen").hide();
        $("#alt5chosen").hide();
        $("#alt6chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt5') {
        $("#alt5chosen").show();
        $("#alt1chosen").hide();
        $("#alt2chosen").hide();
        $("#alt3chosen").hide();
        $("#alt4chosen").hide();
        $("#alt6chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt6') {
        $("#alt6chosen").show();
        $("#alt1chosen").hide();
        $("#alt2chosen").hide();
        $("#alt3chosen").hide();
        $("#alt4chosen").hide();
        $("#alt5chosen").hide();
        $("#alt7chosen").hide();
    } else if ($("input[name='situation']:checked").val() == 'alt7') {
        $("#alt7chosen").show();
        $("#alt1chosen").hide();
        $("#alt2chosen").hide();
        $("#alt3chosen").hide();
        $("#alt4chosen").hide();
        $("#alt5chosen").hide();
        $("#alt6chosen").hide();
    }
}



function determineWhichAddressOptionsToShow() {

    var e = ($('#chooseCategorySelect option:selected').index());
    $('#chooseCategorySelectAdr option').eq(e - 1).attr('selected', 'selected');
    var adr = $('#chooseCategorySelectAdr option:selected').val().split(',');

    if ((adr[0] == 'true') && (adr[1] == 'true') && (adr[2] == 'true')) {
        $('#addressMainstep1').hide();
    } else {
        $('#addressMainstep1').show();
    }
    if (adr[0] == 'true') {
        $('#addressStep1').hide();
    } else {
        $('#addressStep1').show();
    }
    if (adr[1] == 'true') {
        $('#addressStep2').hide();
    } else {
        $('#addressStep2').show();
    }
    if (adr[2] == 'true') {
        $('#addressStep3').hide();
    } else {
        $('#addressStep3').show();
    }
    if (adr[3] == 'true') {
        $('#addressMainstep2').hide();
    } else {
        $('#addressMainstep2').show();
    }
    if (adr[4] == 'true') {
        $('#addressMainstep3').hide();
    } else {
        $('#addressMainstep3').show();
    }
    if (adr[5] == 'true') {
        $('#addressStep4').hide();
    } else {
        $('#addressStep4').show();
    }
    if (adr[6] == 'true') {
        $('#addressStep5').hide();
    } else {
        $('#addressStep5').show();
    }
    if (adr[5] == 'true' && adr[6] == 'true') {
        $('#addressStep3').removeClass('thirdoption');
    }
    if (adr[5] == 'false' && adr[6] == 'true') {
        $('#addressStep4').removeClass('fourthoption');
    }
    if ((adr[3] == 'true') && (adr[4] == 'true')) {
        $('#adralt1').click();
        $('#adralt1').nextAll('.toggleAddressBody').click();
    }
    if ((adr[0] == 'true') && (adr[1] == 'true') && (adr[2] == 'true') && (adr[3] == 'false') && (adr[4] == 'true')) {
        $('#alt4').click();
        $('#alt4').nextAll('.toggleAddressBody').click();
    }
    if ((adr[0] == 'true') && (adr[1] == 'true') && (adr[2] == 'true') && (adr[3] == 'true') && (adr[4] == 'false')) {
        $('#alt5').click();
        $('#alt5').nextAll('.toggleAddressBody').click();
    }
}

function validateCategory() {
    if ((($('#chooseCategorySelect option:selected').val()) == 'invalid1') || (($('#chooseCategorySelect option:selected').val()) == 'invalid2')) {
        $('#chooseCategoryError').show();
    } else {
        if ($("input[name='klage']").val() != 'true') {
            determineWhichAddressOptionsToShow();
        }
        validcategory = true;
        $('#chooseCategoryError').hide();
    }
}

$(".velgAdrSituation").click(function() {
        clearErrorMessages();
		
        if (this.checked) {
            var addressinfo = $(this).parents("div.addressInfo");
            var addressinputbody = addressinfo.find(".addressinputbody");
            addressinputbody.slideDown('fast');
            var siblings = addressinfo.siblings();
            siblings.find(".addressinputbody").slideUp();
            var inputfields = siblings.find("input[type=text]");
            for (x = 0; x < inputfields.length; x = x + 1) {
                inputfields[x].value = "";
            }

            if (!$(this).parents('.addressInfo').hasClass('checked')) {
                $(this).parents('.addressInfo').addClass('checked');
                $(this).parents('.addressInfo').siblings().removeClass('checked');
                return true;
            }
        }
    });


$(document).ready(function() {

 setChosenNavUnit(); 
            $("#userIdNumber").hide();
            $("#enhetsSelectBox").hide();
            $("#enhetsSelectBox2").hide();
            $("#skjema2011userDetails").hide();
            $("#attachmentDownload").hide();
            $(".addressinputbody").hide();
            $(".attachmentbody").hide();
            $(".moreaddressoptions").hide();
            $("#senderChosen").hide();
            $("#previousStepButton").hide();
            $(".NAVerrorBoxWrapper").hide();
			$(".NAVerrorBoxWrapperComplaint").hide();
			addAutocomplete($('#navUnitMultiple'), $("#chosennavunit"), $("#navUnitMultipleSelected"), $("#navUnitMultipleSelectedChangeButton"));
addAutocomplete($('#navUnitOrg'), $("#chosennavunit"), $("#navUnitOrgSelected"), $("#navUnitOrgSelectedChangeButton"));
addAutocomplete($('#excaseNAVKontor'), $("#chosennavunit"), $("#excaseNAVKontorSelected"), $("#excaseNAVKontorSelectedChangeButton"));
addAutocomplete($('#navdepartment1'), $("#chosennavunit"), $("#navdepartment1Selected"), $("#navdepartment1SelectedChangeButton"));

}); // jquery document ready end