function validateInput(){
	
	clearErrorMessages();
	var errorOccured=false;
	
	errorOccured = validerBeskrivelsesFelt();
	
	if(isTilbakemelding()) {
		errorOccured = errorOccured | validerEpostFelt();
	} else if(isKlagePaaService()) {
		errorOccured = errorOccured | validerPersonnummerFelt() | validerOrgnr() | validerValgtEnhet() | validerRequired();
	} else if(isRos()) {
		errorOccured = errorOccured | validerValgtEnhet();
	}

	if (errorOccured) {
		return false;
	}
	
}

function validerRequired() {
    $("form input.required").each(function () {
        var input = $(this);
        var trimmedText = $.trim($(input).val());
         if (trimmedText.length > 0) {
            input.siblings('.formgroup-error').hide();
            return false;
        }
        else {
            input.siblings('.formgroup-error').show();
            return true;
        }
    
    });
}


function clearErrorMessages() {
    $(".orgnrError").hide();
    $(".formgroup-error").hide();
	$(".enhetError").hide();
	$(".pnrError").hide();
	$(".epostError").hide();
	$(".beskrivelseError").hide();
}

function validerBeskrivelsesFelt() {
	var beskrivelseErrorMsg = '';
	if(isTextAreaEmpty($.trim($("#beskrivelse").val()))){
		beskrivelseErrorMsg = '<p>Tilbakemeldingsfeltet er ikke fylt ut</p>';
	}
	
	if (beskrivelseErrorMsg!=''){
		beskrivelseErrorMsg='<a name="scrollTop">&nbsp;</a><div class="NAVerrorBox">' + beskrivelseErrorMsg + '</div>';
		$(".beskrivelseError").html(beskrivelseErrorMsg);
		$(".beskrivelseError").show();
		return true;
	}
	return false;
}

function validerEpostFelt() {
if ($("#tbEmail").length) {
	var epostErrorMsg = '';
	epost = $("#tbEmail").val();
	if (epost !=''){
		AtPos = epost.indexOf("@");
		StopPos = epost.lastIndexOf(".");

		if (AtPos == -1 || StopPos == -1) {
			epostErrorMsg='<p>E-postadressen er ikke gyldig </p>';
		}
	}
	
	if (epostErrorMsg!='') {
		epostErrorMsg='<a name="scrollTop">&nbsp;</a><div class="NAVerrorBox">' + epostErrorMsg + '</div>';
		$(".epostError").html(epostErrorMsg);
		$(".epostError").show();
		return true;
	}
	return false;
}
}
function validerPersonnummerFelt() {
if ($("#klagerPersonnummer").length) {
	var pNrErrorMsg= '';
		
	var fnr = $("#klagerPersonnummer").val();
	if(fnr.length != 11 || isNaN(fnr)) {
		pNrErrorMsg = '<p>Fødselsnummer skal bestå av 11 siffer</p>';
	} else if(!(validateFnr(fnr))) {
		pNrErrorMsg = '<p>Fødselsnummer er ikke gyldig</p>';
	}
	
	if (pNrErrorMsg!=''){
		pNrErrorMsg='<div class="NAVerrorBox">' + pNrErrorMsg + '</div>';
		$(".pnrError").html(pNrErrorMsg);
		$(".pnrError").show();
		return true;
	} else {
		$(".pnrError").html("");
		$(".pnrError").hide();
		return false;
	}
	}
}

function validerOrgnr(){
if ($('#orgnr').length) {
      var orgNrFormat = /^[0-9]{9}$/;
      var orgNr = $('#orgnr').val();
      var orgNrErrorMsg = '<div class="NAVerrorBox"><p>Organisasjonsnummer skal bestå av ni siffer</p></div>';

      
      if (!orgNr.match(orgNrFormat)) {
       $('.orgnrError').html(orgNrErrorMsg).show();
        return true;
      }
      
      else if (orgNr.match(orgNrFormat)) {
       orgMod11(orgNr);
      }

      else {
       return false;
      }
}
}


function orgMod11(orgNr) {
var factor = [3,2,7,6,5,4,3,2], productSum = 0, remainer = 0, controlDigit = 0;
for (var i = 0; i < 8; i++) {
    productSum += orgNr[i] * factor[i];
}
remainer = productSum % 11;
controlDigit = (remainer === 0) ? 0 :  11 - remainer;
if (remainer !== 1 && controlDigit === parseInt(orgNr[8],10)) {
    return false;
}
else {
    orgNrErrorMsg = '<div class="NAVerrorBox"><p>Organisasjonsnummer er ugyldig</p></div>';
    $('.orgnrError').html(orgNrErrorMsg).show();
    return true;
}
}


function validerValgtEnhet() {
	var enhetErrorMsg = '';
	if($("#navEnhetValgt").text()=='') {
		enhetErrorMsg = '<p>Du har ikke valgt NAV-kontor. Velg fra forslagslisten som dukker opp når du taster</p>';
	}
	
	if (enhetErrorMsg!=''){
		enhetErrorMsg='<a name="scrollTop">&nbsp;</a><div class="NAVerrorBox">' + enhetErrorMsg + '</div>';
		$(".enhetError").html(enhetErrorMsg);
		$(".enhetError").show();
		document.location.hash = "#scrollTop";
		return true;
	} else {
		$(".enhetError").html("");
		$(".enhetError").hide();
		return false;
	}
}

function isTextAreaEmpty(textAreaContent) {
	return textAreaContent == '' || textAreaContent == beskrivelseInitText;
		
}

function onBlur(el) {
	if (el.value == '') {
		el.value = el.defaultValue;
		$(el).addClass('defaultText');
	}
}

function onFocus(el) {
	if (el.value == el.defaultValue) {
		el.value = '';
		$(el).removeClass('defaultText');
	}
}

function endreValgtEnhet() {
	$("#velgNavEnhetChangeButton").hide();
	$("#navEnhetValgt").text('');
	$("#navEnhetValgt").hide();
	$("#velgNavEnhet").val('');
	$("#velgNavEnhet").show();
	if($("input[name='subject']").val() == 'Ros') {
		$("input[name='to']").val(defaultEpostadresse);
	}
}

function imposeMaxLength(Event, object, maxLen) {
	if(object.value.length > maxLen) {
		object.value = object.value.substring(0, maxLen);
	}
	var gjenstaar = maxLen - object.value.length;
	$("span#gjenstaar").text(gjenstaar);
	return (object.value.length <= maxLen) || (Event.keyCode == 8 || Event.keyCode == 46 || (Event.keyCode>=35 && Event.keyCode<=40));
}

function textareaInit() {
	if ($("#beskrivelse").val() === beskrivelseInitText) {
		$("#beskrivelse").addClass("defaultText");
	} else {
		$("#beskrivelse").removeClass("defaultText");
	}
}

function nullstill() {
	if(!isTilbakemelding()) {
		nullstillValgtEnhet();
	}
	nullstillBeskrivelsesFelt();
	clearErrorMessages();
}

function nullstillValgtEnhet() {
	$("#velgNavEnhetChangeButton").click();
}

function nullstillBeskrivelsesFelt() {
	$("span#gjenstaar").text('1000');
	$("#beskrivelse").addClass('defaultText');
}

function settMottakerEpost(data) {
	if (data.length > 2) {
		$("input[name='to']").val(data);
	}
}

function populateSubjectFieldWithSelectedCategory() {
	$("input[name='subject']").val($("#selectCategory").val());
}

function isTilbakemelding() {
	return $("input[name='subject']").val() == 'Tilbakemelding' || $("input[name='subject']").val() == $("#selectCategory").val();
}

function isKlagePaaService() {
	return $("input[name='subject']").val() == 'Serviceklage';
}

function isRos() {
	return $("input[name='subject']").val() == 'Ros';
}


$(function() {
$('#typeofservice').change(function(){
   if ($(this).val() === 'other') {
    $('#othertypeofservice').parent('div').show();
   }
   else {
   $('#othertypeofservice').val('').parent('div').hide();
   }
    });
  });
