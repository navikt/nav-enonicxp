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

function togglePanelsPrivatperson() {

			$("#utlandContactEnhetSuggest").hide();
            $("#contactEnhetSuggest").hide();
		    $('h1#steg_header, p#steg_header_info').text("Du er på steg 3 av 5; Kryss av for vedlegg");
		    $("#notworkinnorwayfnr").val('');

			$("#innorwayfnr").val('');
		    $(".addressinputbody").hide();
			if (window.location.hash != '#adr')
			 {
				$(".skjema2011form-details").hide();
				$("#downloadbutton").hide();
				$(".addressinputbody").hide();

             }
             else

             {
             	$("#skjema2011userDetails").show();
                $("#skjema2011-schemaAndAttachment").hide();
                $(document).scrollTop(0);
                showAddressChoices();
				$(".vedleggsveileder1").hide();
				$(".vedleggsveileder2").hide();
				$(".vedleggsveileder3").hide();
				$(".vedleggsveileder4").hide();
				$(".vedleggsveileder5").show();
				$(".vedleggsveileder6").show();
				$(".vedleggsveileder5").removeClass('waiting');
				$(".vedleggsveileder5").addClass('selected');
				$(".vedleggsveileder6").addClass('waiting');
          
             }
				$(".attachmentbody").hide();
				$(".NAVerrorBoxWrapper").hide();
				$("#NAVskjema2011DownloadContainer").hide();
				
}

function togglePanelsEttersendelse()
{

  $('h1#steg_header, p#steg_header_info').text("Du er på steg 3 av 5; Kryss av for vedlegg");

			$("#notworkinnorwayfnr").val('');
			$("#innorwayfnr").val('');
			$(".NAVerrorBoxWrapper").hide();
		    $(".moreaddressoptions").hide();
			if (window.location.hash != '#adr')
			 {

				$(".skjema2011form-details").hide();

				$("#downloadbutton").hide();

				$(".addressinputbody").hide();

             }

             else

             {

             

             	$(".skjema2011form-details").show();

                $("#skjema2011-schemaAndAttachment").hide();

                $(document).scrollTop(0);            

             $(".vedleggsveileder1").hide();
				$(".vedleggsveileder2").hide();
				$(".vedleggsveileder3").hide();
				$(".vedleggsveileder4").hide();
				$(".vedleggsveileder5").show();
				$(".vedleggsveileder6").show();
				$(".vedleggsveileder5").removeClass('waiting');
				$(".vedleggsveileder5").addClass('selected');
				$(".vedleggsveileder6").addClass('waiting');

             }

}

function validateFindAddress() {
    if ($("input[name='situation']:checked").val() == 'alt1') {
        validateFnr($("#innorwayfnr").val());
        if ($("#selectEnhet option:selected").val() != undefined) {
            $("#chosennavunit").val($("#selectEnhet option:selected").val());
        }
        if (validfnr == false) {
            $('#fnrError').show();
            $('.NAVerrorBoxWrapper').show();
        }
    } else if ($("input[name='situation']:checked").val() == 'alt2') {
        if ($("#selectEnhet2 option:selected").val() != undefined) {
            $("#chosennavunit").val($("#selectEnhet2 option:selected").val());
        }
        validfnr = true;
    } else if ($("input[name='situation']:checked").val() == 'alt3') {
        validateFnr($("#notworkinnorwayfnr").val());
        if (validfnr == false) {
            $('#fnrUtlandError').show();
            $('.NAVerrorBoxWrapper').show();
        }
    } else if ($("input[name='situation']:checked").val() == 'alt4') {
        if ($("#navUnitMultipleSelected").text() == '') {
            $('#navUnitMultipleError').show();
            $('.NAVerrorBoxWrapper').show();
        } else {
            checkPostalNumber();
            validfnr = true;
        }
    } else if ($("input[name='situation']:checked").val() == 'alt5' && $("input[name='klage']").val() == 'true') {
        validateFnr($("#innorwayfnr").val());

        if (validfnr == false) {
            $('#fnrError').show();
            $('.NAVerrorBoxWrapper').show();
        }
        if ($("#navUnitOrgSelected").text() == '') {
            $('#navUnitOrgError').show();
            $('.NAVerrorBoxWrapper').show();
            validinput = false;
        } else {
            checkPostalNumber();
        }
    } else if ($("input[name='situation']:checked").val() == 'alt5') {
        if ($("#navUnitOrgSelected").text() == '') {
            $('#navUnitOrgError').show();
            $('.NAVerrorBoxWrapper').show();
        } else {
            checkPostalNumber();
            validfnr = true;
        }
    } else if ($("input[name='situation']:checked").val() == 'alt6') {
        validfnr = true;
    } else if ($("input[name='situation']:checked").val() == 'alt7') {
        validfnr = true;
    }
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

function onBlur(el) {
    if (el.value == '') {
        el.value = el.defaultValue;
    }
}

function onFocus(el) {
    if (el.value == el.defaultValue) {
        el.value = '';
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

function setsenderChosenVariables() {
    $("#innorwayzipchosen").text($("#innorwayzip").val());
    $("#innorwayfnrchosen").text($("#innorwayfnr").val());
    if (($("#selectEnhet option:selected").text() != 'undefined') && ($("#selectEnhet option:selected").text() != '')) {
        $("#navofficeleadtext").show();
        $("#selectedUnitChosen2").text('');
        $("#selectedUnitChosen").text($("#selectEnhet option:selected").text());
    } else if (($("#selectEnhet2 option:selected").text() != 'undefined') && ($("#selectEnhet2 option:selected").text() != '')) {
        $("#navofficeleadtext").hide();
        $("#selectedUnitChosen").text('');
        $("#navofficeleadtext2").show();
        $("#selectedUnitChosen2").text($("#selectEnhet2 option:selected").text());
    } else {
        $("#selectedUnitChosen").text('');
        $("#selectedUnitChosen2").text('');
        $("#navofficeleadtext").hide();
        $("#navofficeleadtext2").hide();
    }
    $("#notinnorwaycoaddresschosen").text($("#notinnorwaycoaddress").val());
    $("#notinnorwaystreetaddresschosen").text($("#notinnorwaystreetaddress").val());
    $("#notinnorwayzipchosen").text($("#notinnorwayzip").val());
    $("#notinnorwaypostalplacechosen").text($("#notinnorwaypostalplace").val());
    $("#notworkinnorwayfnrchosen").text($("#notworkinnorwayfnr").val());
    $("#navunitchosenmultiple").text($("#navUnitMultipleSelected").text());
    $("#navunitchosenorg").text($("#navUnitOrgSelected").text());
}

function showErrorMessage() {
    $('.NAVerrorBoxWrapper').show();
    if ($('input[name="situation"]:checked').val() == 'alt1') {
        $('#errorBoxZip').show();
    } else if ($('input[name="situation"]:checked').val() == 'alt2') {
        $('#errorBoxZip2').show();
    } else if ($('input[name="situation"]:checked').val() == 'alt3') {
        $('#fnrUtlandError').show();
    }
}

function clearErrorMessages() {
    $('.NAVerrorBoxWrapper').hide();
    $('#skjema2011userDetails .NAVerrorBox').hide();
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

function validateFields() {
    var active = $('input[name=situation]:checked:first').parents('.addressInfo');
    // To be validated
    var notActive = $(active).siblings('.addressInfo');
    // To be cleared
    $('.invalidfield', notActive).removeClass('invalidfield');
    // Cancel all errors in irrelevant fields
    $("#enhetsSelectBox", notActive).hide();
    $("#enhetsSelectBox2", notActive).hide();
    if ((!active.length > 0) && (($('input[name="chooseSenderSituation"]:checked').val() == 'alt1'))) {
        $('#missingaddresserrormsg').show();
    } else {
        checkUserInputs(active);
    }
}

function checkUserInputs(active) {
    // Continuing validation (relevant input fields only)

    var userZipExpression = /^[0-9]{4}$/;
    $('.required', active).each(function() {
        // validate required fields upon submit and visitCoAdr
        var input = $(this);

        if ($(input).hasClass('postalcode')) {
            // POSTNUMMER

            var validated = $(input).val().match(userZipExpression);

            if (!validated) {
                $(input).not('.invalidfield').addClass('invalidfield');
                // invalidfield
                showErrorMessage();
                validinput = false;
            } else {
                $(input).removeClass('invalidfield');
                // Good to go!
            }
        }
    });

    $('#notinnorwaycoaddress', active).each(function() {
        var input = $(this);
        var trimmedText = $.trim($(input).val());
        if (hasIllegalChars(trimmedText)) {
            $(input).not('.invalidfield').addClass('invalidfield');
            $('#notinnorwaycoaddresserror').show();
            $('.NAVerrorBoxWrapper').show();
            validinput = false;
        } else if (hasNumbers(trimmedText)) {
            $(input).not('.invalidfield').addClass('invalidfield');
            $('#notinnorwaycoaddresserror').show();
            $('.NAVerrorBoxWrapper').show();
            validinput = false;
        } else {
            $(this).removeClass('invalidfield');
        }
    });

    $('#notinnorwaystreetaddress', active).each(function() {
        var input = $(this);
        var trimmedText = $.trim($(input).val());

        if ($(input).hasClass('required') && !trimmedText.length > 0) {
            $(input).not('.invalidfield').addClass('invalidfield');
            // invalidfield
            $('.NAVerrorBoxWrapper').show();
            $('#notinnorwaystreetaddresserror').show();
            validinput = false;
        } else if (hasIllegalChars(trimmedText)) {
            $('.NAVerrorBoxWrapper').show();
            $('#notinnorwaystreetaddresserror').show();
            validinput = false;
        } else {
            $(this).removeClass('invalidfield');
        }
    });
}

function hasIllegalChars(input) {
    //define illegal characters here:
    return input.match(/[\[\]=\/\?@\:\;\|�!#��\$%&{}\+\^�~`�*><]/g);
}

function hasNumbers(input) {
    return input.match(/\d/);
}

function addToOptionList(OptionList, OptionText, OptionValue) {
    OptionList[OptionList.length] = new Option(OptionText, OptionValue);
}

function clearOptionsList(OptionList) {
    for (x = OptionList.length; x >= 0; x = x - 1) {
        OptionList[x] = null;
    }
}

function validateFnr(fodselsNummer) {
    var numArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var checksum = 0;
    var rest = 0;
    var WEIGHTS1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
    var WEIGHTS2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    var BIRTH_NUMBER_LENGTH = 11;
    var CHECKSUM_CONSTANT = 11;
    var CHECKSUM_MODULO = 11;

    if ((fodselsNummer == "undefined") || (fodselsNummer.length != BIRTH_NUMBER_LENGTH) || ("00000000000" == fodselsNummer)) {
        return false;
    }

    for (i = 0; i < BIRTH_NUMBER_LENGTH; i++) {
        var c = fodselsNummer.charAt(i);
        if ('0' > c || '9' < c) {
            return false;
        }
        numArray[i] = c;
    }

    for (i = 0; i < BIRTH_NUMBER_LENGTH - 2; i++) {
        checksum += numArray[i] * WEIGHTS1[i];
    }

    rest = checksum % CHECKSUM_MODULO;

    if (rest == 0) {
        rest = CHECKSUM_CONSTANT;
    }

    checksum = parseInt(numArray[BIRTH_NUMBER_LENGTH - 2]) + rest - CHECKSUM_CONSTANT;

    if (checksum != 0) {
        return false;
    }

    checksum = 0;
    for (i = 0; i < BIRTH_NUMBER_LENGTH - 1; i++) {
        checksum += numArray[i] * WEIGHTS2[i];
    }

    rest = checksum % CHECKSUM_MODULO;

    if (rest == 0 || rest == 1) {
        rest = CHECKSUM_CONSTANT;
    }

    checksum = parseInt(numArray[BIRTH_NUMBER_LENGTH - 1]) + rest - CHECKSUM_CONSTANT;

    if (checksum == 0) {
        validfnr = true;
    }
    return checksum == 0;
}

function checkPostalNumberCallback(json) {
    mottakerEnheter = json;

    if ($('input[name="situation"]:checked').val() == 'alt2') {
        $("#notinnorwaypostalplace").val(mottakerEnheter.postalPlace);
    }
    if (mottakerEnheter != null && mottakerEnheter.offices.length == 1) {
        $("#chosennavunit").val(mottakerEnheter.offices[0].id);
    } else if (mottakerEnheter != null && mottakerEnheter.offices.length > 1) {
        clearOptionsList(document.formgenerator.enhetsvalg);
        clearOptionsList(document.formgenerator.enhetsvalg2);
        for (n in mottakerEnheter.offices) {
            if (mottakerEnheter.offices[n].hasOwnProperty('name')) { // jslint
                var office = mottakerEnheter.offices[n];
                addToOptionList(document.formgenerator.enhetsvalg, office.name, office.id);
                addToOptionList(document.formgenerator.enhetsvalg2, office.name, office.id);
            }
        }
        if ($('input[name="situation"]:checked').val() == 'alt1') {
            $("#enhetsSelectBox").show();
            $("#selectEnhet").val(mottakerEnheter.offices[0].id);
        }
        if ($('input[name="situation"]:checked').val() == 'alt2') {
            $("#enhetsSelectBox2").show();
            $("#selectEnhet2").val(mottakerEnheter.offices[0].id);
        }
    }
}

function checkPostalNumber() {
    var params = retrieveNecessaryParams($('#formgenerator').serialize(), 1, true);
    $.ajax({
        url: postNrCheckUrl,
        dataType: 'script',
        data: params,
        type: 'GET'
    });
}

function retrieveNecessaryParams(params, alt, isPostnummerCheck) {
    var postnrString = 'innorwayzip';
    if (alt == 2) {
        postnrString = 'notinnorwayzip';
    }
    var paramArray = params.split('&');
    var result = '';
    var iterator = 0;
    if (isPostnummerCheck) {
        for (i = 0; i < paramArray.length; i++) {
            if (paramArray[i].indexOf('situation') >= 0 || paramArray[i].indexOf('type') >= 0 || paramArray[i].indexOf('key') >= 0 || paramArray[i].indexOf(postnrString) >= 0) {
                if (iterator != 0) {
                    result += '&';
                }
                result += paramArray[i];
                iterator++;
            }
        }
    } else {
        for (i = 0; i < paramArray.length; i++) {
            if (paramArray[i].indexOf('=') != paramArray[i].length - 1) {
                if (iterator != 0) {
                    result += '&';
                }
                result += paramArray[i];
                iterator++;
            }
        }
    }
    return result;
}

function changeValue(newValue) {
    $("#chosenNavUnit").attr("value", newValue);
}

function setChosenNavUnit() {
    $("#alt1").click(function() {
        $("#chosennavunit").val("");
    });
    $("#alt2").click(function() {
        $("#chosennavunit").val("");
    });
    $("#alt3").click(function() {
        $("#chosennavunit").val("");
    });
    $("#alt4").click(function() {
        $("#chosennavunit").val("");
    });
    $("#alt5").click(function() {
        $("#chosennavunit").val("");
    });
    $("#alt6").click(function() {
        $("#chosennavunit").val($("#navofficealt6").val());
    });
    $("#alt7").click(function() {
        $("#chosennavunit").val($("#navofficealt7").val());
    });
}

function finnAdresseInit() {
    $("#navUnitOrgSelectedChangeButton").hide();
    $("#navUnitMultipleSelectedChangeButton").hide();
    $("#navdepartment1SelectedChangeButton").hide();
    $("#excaseNAVKontorSelectedChangeButton").hide();

    $("#adralt1").click(function() {
        $("#alt4").attr("checked", false);
        $("#alt5").attr("checked", false);
    });

    $("#alt4").click(function() {
        $("#adralt1").attr("checked", false);
    });

    $("#alt5").click(function() {
        $("#adralt1").attr("checked", false);
    });

    $("#alt6").click(function() {
        $("#chosennavunit").val($("#navofficealt6").val());
    });
    $("#alt7").click(function() {
        $("#chosennavunit").val($("#navofficealt7").val());
    });

    // Autocomplete
    if ($('input.excase').is(':checked')) {
        $(this).parents('.definerelation').siblings('div.navdepartment').show();
    }

    $('input.excase').click(function() {
        if ($(this).is(':checked')) {
            $(this).parents('.definerelation').siblings('div.navdepartment').show();
        }
        else {
            $(this).parents('.definerelation').siblings('div.navdepartment').hide();
        }
    });

    $('.definerelation input[type=radio]:not(.excase)').click(function() {
        $(this).parents('.definerelation').siblings('div.navdepartment').hide().find('input.ac_input').attr('value', '');
    });

    $(".toggleAddressBody").click(function(e) {

        var address = $(this).parents("div.NAVskjemaIndre").children("div.moreaddressoptions");
        var src = $(this).attr('src');
        var siblings = $(this).parents('.NAVskjemaIndre').siblings();

        if (address.is(':hidden')) {
		
            address.slideDown('fast');
            $(this).attr('src', src.replace('apne', 'lukk'));
            $(this).attr('alt', 'Klikk her for å skjule adresseinformasjon');
            siblings.find('.moreaddressoptions').slideUp();
	
            siblings.find('.toggleAddressBody').each(function() {
                $(this).attr('src', $(this).attr('src').replace('lukk', 'apne'));
            });
        } else {
		
            address.slideUp('fast');
            $(this).attr('src', src.replace('lukk', 'apne'));
            $(this).attr('alt', 'Klikk her for å gi inn adresseinformasjon');
        }
        e.preventDefault();
        clearErrorMessages();
		
    });

    $(".chooseSenderSituation").click(function() {

        var address = $(this).parents("div.userinputsection");
        var moreaddressoptions = address.find(".moreaddressoptions");
        var siblings = $(this).parents('.NAVskjemaIndre').siblings();
	
        var inputfields = siblings.find("input[type=text]");
        for (x = 0; x < inputfields.length; x = x + 1) {
            inputfields[x].value = "";
        }

        if ($("input[name='type']").val() == 'ettersendelsearbeidsgiver') {
            var userinputsectionIndre = $(this).parents(".userinputsectionIndre");
            var ettersendelsearbeidsgiveroptions = userinputsectionIndre.find(".ettersendelsearbeidsgiveroptions");
            if (this.checked && ettersendelsearbeidsgiveroptions.is(":hidden")) {
                $([address[0]]).find(".toggleAddressBody").click();
            }
        } else {
            if (this.checked && moreaddressoptions.is(":hidden")) {
                address.find(".toggleAddressBody").click();
            }
        }

        if (!$(this).parents('.NAVskjemaIndre').hasClass('checked')) {
            $(this).parents('.NAVskjemaIndre').addClass('checked');
            $(this).parents('.NAVskjemaIndre').siblings().removeClass('checked');
				
           return true;
        }
    });

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

    $('input.#navUnitMultiple').autocomplete(autocompleteUrl, {
        selectFirst: false,
        minChars: 2,
        mustMatch: false,
        delay: 800,
        cacheLength: 500,
        max: 120
    }).result(function(evt, data, formatted) {
            $("#chosennavunit").val(data[1]);
            $("#navUnitMultipleSelected").text(data[0]);
            $("#navUnitMultipleSelected").show();
            $("#navUnitMultipleSelectedChangeButton").show();
            $("#navUnitMultiple").hide();
            clearErrorMessages();
        });

    $('input.#navUnitOrg').autocomplete(autocompleteUrl, {
        selectFirst: false,
        minChars: 2,
        mustMatch: false,
        delay: 800,
        cacheLength: 500,
        max: 120
    }).result(function(evt, data, formatted) {
            $("#chosennavunit").val(data[1]);
            $("#navUnitOrgSelected").text(data[0]);
            $("#navUnitOrgSelected").show();
            $("#navUnitOrgSelectedChangeButton").show();
            $("#navUnitOrg").hide();
            clearErrorMessages();
        });

    $('input.#excaseNAVKontor').autocomplete(autocompleteUrl, {
        selectFirst: false,
        minChars: 2,
        mustMatch: false,
        delay: 800,
        cacheLength: 500,
        max: 120
    }).result(function(evt, data, formatted) {
            $("#chosennavunit").val(data[1]);
            $("#excaseNAVKontorSelected").text(data[0]);
            $("#excaseNAVKontorSelected").show();
            $("#excaseNAVKontorSelectedChangeButton").show();
            $("#excaseNAVKontor").hide();
            clearErrorMessages();
        });

    $('input.#navdepartment1').autocomplete(autocompleteUrl, {
        selectFirst: false,
        minChars: 2,
        mustMatch: false,
        delay: 800,
        cacheLength: 500,
        max: 120
    }).result(function(evt, data, formatted) {
            $("#chosennavunit").val(data[1]);
            $("#navdepartment1Selected").text(data[0]);
            $("#navdepartment1Selected").show();
            $("#navdepartment1SelectedChangeButton").show();
            $("#navdepartment1").hide();
            clearErrorMessages();
        });

    $("#innorwayzip").bind('keyup', function(e) {
        var userZipExpression = /^[0-9]{4}$/;
        var zipCode = $(this).val();
        if (zipCode.length == 4 && zipCode.match(userZipExpression)) {
            checkPostalNumber();
            $("#enhetsSelectBox").hide();
            //special value for not selected
            $("#selectEnhet option:selected").text('undefined');
            $("#selectEnhet option:selected").val('undefined');
        }
    });

    $("#notinnorwayzip").bind('keyup', function(e) {
        var userZipExpression = /^[0-9]{4}$/;
        var zipCode = $(this).val();
        if (zipCode.length == 4 && zipCode.match(userZipExpression)) {
            checkPostalNumber();
            $("#enhetsSelectBox2").hide();
            $("#selectEnhet2 option:selected").text('undefined');
            $("#selectEnhet2 option:selected").val('undefined');
        }
    });
}

function readCookie(name) {
    var nameEQ = encodeURI(name) + "=";
    var cookieArray = document.cookie.split(";");
    for (var i = 0; i < cookieArray.length; i++) {
        var cookie = cookieArray[i];
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1, cookie.length);
            if (cookie.indexOf(nameEQ) == 0) {
                return decodeURI(cookie.substring(nameEQ.length, cookie.length));
            }
        }
    }
    return null;
}

$(document).ready(function() {
    setChosenNavUnit(); 
    if ($('#excase1').is(':checked')) {
        if (readCookie("skjemaveileder_chosennavunit_privatperson") === '') {
            $('#contactEnhetSuggest').css('display', 'block');
        } else {
            $('#contactEnhetSuggest').css('display', 'block');
            $('#navdepartment1').css('display', 'none');
            $('#navdepartment1Selected').css('display', 'inline');
            $('#navdepartment1SelectedChangeButton').css('display', 'inline');
            $('#navdepartment1Selected').text(readCookie("skjemaveileder_chosennavunit_privatperson"));
        }
    } /*else if ($("input[name='type']").val() == 'ettersendelsearbeidsgiver') {
        if (readCookie("skjemaveileder_chosennavunit_ettersendelsearbeidsgiver") === '') {
            $('#navUnitOrg').css('display', 'block');
        } else {
            $('#navUnitOrg').css('display', 'none');
            $('#navUnitOrgSelected').css('display', 'inline');
            $('#navUnitOrgSelectedChangeButton').css('display', 'inline');
            $('#navUnitOrgSelected').text(readCookie("skjemaveileder_chosennavunit_ettersendelsearbeidsgiver"));
        }
    }*/
});