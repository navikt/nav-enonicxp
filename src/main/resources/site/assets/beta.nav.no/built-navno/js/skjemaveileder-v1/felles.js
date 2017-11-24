// Selecting attachments
    if (!$(".velgBoks").checked) {
        $(".velgBoks").siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', true);
    }

    $(".velgBoks").click(function() {
        var attachment = $(this).parents("div.attachment");
        var attachmentBody = attachment.children(".text-wrapper").children(".attachmentbody");

        if (this.checked && attachmentBody.is(":hidden")) {
            attachment.find(".toggleAttachmentBody").click();
        } else if (!this.checked && attachmentBody.is(":not(:hidden)")) {
            // slideUp when deselecting checkbox
            attachment.find(".toggleAttachmentBody").click();
            attachmentBody.slideUp('fast');
        }

        if (!this.checked) {
            $(this).siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', true);
            $(this).parent().find('input[type=checkbox][checked]').attr('checked', false);
        } else {
            $(this).siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', false);
        }
        // Toggle attachment background color
        if (!$(this).parent('.NAVskjemaIndre').hasClass('checked')) {
            $(this).parent('.NAVskjemaIndre').addClass('checked');
        } else {
            $(this).parent('.NAVskjemaIndre').removeClass('checked');
        }
    });
	
$(".toggleAttachmentBody").click(function(e) {
        var attachment = $(this).parents("div.attachment").children(".text-wrapper").children(".attachmentbody");
        var src = $(this).attr('src');

        if (attachment.is(':hidden')) {
            attachment.slideDown('fast');
            $(this).attr('src', src.replace('apne', 'lukk'));
            $(this).attr('alt', 'Klikk her for å skjule mer informasjon');
        } else {
            attachment.slideUp('fast');
            $(this).attr('src', src.replace('lukk', 'apne'));
            $(this).attr('alt', 'Klikk her for mer informasjon');
        }

        e.preventDefault();
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
	
	
	
function gotoSelectVedlegg() {
    $("#skjema2011-schemaAndAttachment").show();
    $(".skjema2011form-details").hide();
    $("#NAVskjema2011DownloadContainer").hide();
    $(".vedleggsveileder1").addClass("selected");
    $(".vedleggsveileder2").removeClass("selected");
    $(".vedleggsveileder2").addClass("waiting");
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 3 av 5; Kryss av for vedlegg");
}
	
function goToDownloadSkjemaveileder(skjemaveilederURL) {
	changeexcaseNAVKontor();
	changenavdepartment1();
	changeSelectedNavUnitMultiple();
	createCookie("skjemaveileder_chosennavunit_privatperson", $("#navdepartment1Selected").text(), 0.01);
if (($("input[name='situation']:checked").val()) == undefined) {
	$("#notChosenAnySituationError").show();
} else {
if ((($("input[name='situation']:checked").val()) == 'alt6') || (($("input[name='situation']:checked").val()) == 'alt7')) {
	$('form#formgenerator').submit();
}
	validinput = true;
	clearErrorMessages();
	validfnr = false;
	validateFields();
	validateFindAddress();
}
if ((validinput == true) && (validfnr == true)) {
	$("#formgenerator").attr("action", skjemaveilederURL);
	$('form#formgenerator').submit();
}
} 

function goToDownload() {
//    if ($("input[name='type']").val() == 'ettersendelsearbeidsgiver') {
//        createCookie("skjemaveileder_chosennavunit_ettersendelsearbeidsgiver", $("#navUnitOrgSelected").text(), 0.01);
//    } else {
//    }
changeexcaseNAVKontor();
	changenavdepartment1();
	changeSelectedNavUnitMultiple();
    createCookie("skjemaveileder_chosennavunit_privatperson", $("#navdepartment1Selected").text(), 0.01);

    if (($("input[name='situation']:checked").val()) == undefined) {
        $("#notChosenAnySituationError").show();
    } else {
        if ((($("input[name='situation']:checked").val()) == 'alt6') || (($("input[name='situation']:checked").val()) == 'alt7')) {
            $('form#formgenerator').submit();
        }

        validinput = true;
        clearErrorMessages();
        validfnr = false;
        validateFields();
        validateFindAddress();
    }

    if ((validinput == true) && (validfnr == true)) {
        $('form#formgenerator').submit();
    }
}
	
function goToUserDetailsPrivatpersonEttersendelse() {
	window.location.hash = "adr";
	$(".skjema2011form-details").show();
	$("#downloadbutton").show();
	$("#skjema2011-schemaAndAttachment").hide();
	$("#NAVskjema2011DownloadContainer").hide();
	$(document).scrollTop(0);
}

function changeSelectedNavUnitOrg()
{
 $("#navUnitOrgSelectedChangeButton").hide();
 $("#navUnitOrg").val($("#navUnitOrgSelected").text());
 $("#navUnitOrgSelected").hide();
 $("#navUnitOrg").show();
}

function changeSelectedNavUnitMultiple()
{
 $("#navUnitMultipleSelectedChangeButton").hide();
 $("#navUnitMultiple").val($("#navUnitMultipleSelected").text());
 $("#navUnitMultipleSelected").hide();
 $("#navUnitMultiple").show();
}

function changenavdepartment1()
{
 $("#navdepartment1SelectedChangeButton").hide();
 $("#navdepartment1").val($("#navdepartment1Selected").text());
 $("#navdepartment1Selected").hide();

 $("#navdepartment1").show();
}

function changeexcaseNAVKontor()
{
 $("#excaseNAVKontorSelectedChangeButton").hide();
 $("#excaseNAVKontor").val($("#excaseNAVKontorSelected").text());
 $("#excaseNAVKontorSelected").hide();
 $("#excaseNAVKontor").show();
}

function checkCategory() {
    var adr = $('#chooseCategorySelectAdr').val().split(',');

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
    if ($("input[name='type']").val() != 'ettersendelsearbeidsgiver') {
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
}


function clearErrorMessages() {
    $('.NAVerrorBoxWrapper').hide();
	$('.NAVerrorBoxWrapperComplaint').hide();
    $('#skjema2011userDetails .NAVerrorBox').hide();
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
	 $('.NAVerrorBoxWrapperComplaint').show();
    if ($('input[name="situation"]:checked').val() == 'alt1') {
        $('#errorBoxZip').show();
    } else if ($('input[name="situation"]:checked').val() == 'alt2') {
        $('#errorBoxZip2').show();
    } else if ($('input[name="situation"]:checked').val() == 'alt3') {
        $('#fnrUtlandError').show();
    }
}


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
	
	
function createCookie(name, value, days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = encodeURI(name) + "=" + encodeURI(value) + expires + "; path=/";
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
			$('.NAVerrorBoxWrapperComplaint').show();
        }
        if ($("#navUnitOrgSelected").text() == '') {
            $('#navUnitOrgError').show();
            $('.NAVerrorBoxWrapper').show();
			$('.NAVerrorBoxWrapperComplaint').show();
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
   
   

function checkPostalNumber() {
    var params = retrieveNecessaryParams($('#formgenerator').serialize(), 1, true);
    $.ajax({
        url: postNrCheckUrl,
        dataType: 'script',
        data: params,
        type: 'GET'
    });
}

function addToOptionList(OptionList, OptionText, OptionValue) {
    OptionList[OptionList.length] = new Option(OptionText, OptionValue);
}

function clearOptionsList(OptionList) {
    for (x = OptionList.length; x >= 0; x = x - 1) {
        OptionList[x] = null;
    }
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

function addAutocomplete(inputElement, valueElement, labelElement, changeButton) {

    inputElement.autocomplete({
	
        source: function (request, response) {
	
            request.term = request.term.replace(/Ã¦/g, "%C3%A6");
            request.term = request.term.replace(/Ã¸/g, "%C3%B8");
            request.term = request.term.replace(/Ã¥/g, "%C3%A5");
            request.term = request.term.replace(/Ã†/g, "%C3%86");
            request.term = request.term.replace(/Ã˜/g, "%C3%98");
            request.term = request.term.replace(/Ã…/g, "%C3%85");
			
            $.get(autocompleteUrl + '?term=' + request.term, function (data) {
                if (data) {
                    response(JSON.parse(data));
                }
            });
        },
        minLength: 2,
        delay: 400,
        select: function (event, ui) {
            valueElement.val(ui.item.value);
            labelElement.text(ui.item.label);
            labelElement.show();
            changeButton.show();
            inputElement.hide();
            clearErrorMessages();
        },
        focus: function (event, ui) {
            return false;
        }
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


function hasIllegalChars(input) {
    //define illegal characters here:
    return input.match(/[\[\]=\/\?@\:\;\|ï¿½!#ï¿½ï¿½\$%&{}\+\^ï¿½~`ï¿½*><]/g);
}

function changeValue(newValue) {
    $("#chosenNavUnit").attr("value", newValue);
}


function hasNumbers(input) {
    return input.match(/\d/);
}

function goBack() {
    history.go(- 1);
    $("#NAVvedleggsveilederContainer").show();	
    $("#NAVvedleggsveilederDownloadContainer").hide();
	$("#navdepartment1Selected").show();
	$("#navUnitOrgSelected").show();
	$("#navUnitMultipleSelected").show();
	$("#excaseNAVKontorSelected").show();
}



