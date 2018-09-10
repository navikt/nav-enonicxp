var mottakerEnheter = null;
var correctBirthNumber = false;
var correctOrgNumber = false;
var correctFodselsellerorgnr = false;
var vedleggsveilederSteg = 1;
var pageTitle = document.title;

/*Progressbar and title*/
function addStepToPageTitle() {
	document.title = pageTitle + ' - ' + $('#steg_i_innsendingsveileder li.selected').text().replace('>', '');
}
function moveStepIndicatorForInnsendingsveileder(steg) {
    $("#steg_i_innsendingsveileder li.waiting").removeClass("waiting");
	$('#steg_i_innsendingsveileder li.vedleggsveileder'+vedleggsveilederSteg).removeClass('selected');
	vedleggsveilederSteg=steg;
	$('#steg_i_innsendingsveileder li.vedleggsveileder'+vedleggsveilederSteg).addClass('selected');
	$("#steg_i_innsendingsveileder li.selected ~ li").addClass("waiting");
	addStepToPageTitle();
}

function showInnsendingsveilederSteg3() {
	$("#schemaAndAttachments").show();
	$("#schemaAndAttachments div.submit").css('visibility', 'visible');
	$("#userDetails").hide();
	moveStepIndicatorForInnsendingsveileder(1);	
}

function showInnsendingsveilederSteg4() {
    $(".dob").val(''); // remove identity upon loading
	$("#NAVvedleggsveilederContainer, #userDetails").show();
	$("#NAVvedleggsveilederDownloadContainer, #schemaAndAttachments").hide();
	moveStepIndicatorForInnsendingsveileder(2);
}

function showInnsendingsveilederSteg5() {
	$("#NAVvedleggsveilederContainer").hide();
	$("#NAVvedleggsveilederDownloadContainer").show();
	moveStepIndicatorForInnsendingsveileder(3);
}

function getAvailabilityText(totalCount, currentPosition) {
	if(totalCount == 5 && currentPosition == 3) {
		return "Du er på steg 3 av 5; Kryss av for vedlegg";
	} else if(totalCount == 3 && currentPosition == 1) {
		return "Du er på steg 1 av 3; Kryss av for vedlegg";
	} else if((totalCount == 5 && currentPosition == 4) || (totalCount == 3 && currentPosition == 2)) {
		return "Du er på steg " + currentPosition + " av "+totalCount+"; Finn adresse";
	} else if((totalCount == 5 && currentPosition == 5) || (totalCount == 3 && currentPosition == 3)) {
		return "Du er på steg " + currentPosition + " av "+totalCount+"; Last ned";
	}
}

function goBack() {
    history.go(-1);
    $("#NAVvedleggsveilederContainer").show();
    $("#NAVvedleggsveilederDownloadContainer").hide();
	moveStepIndicatorForInnsendingsveileder(2);
}

/*Form validation / misc */
function addToOptionList(OptionList, OptionText, OptionValue) {
    OptionList[OptionList.length] = new Option(OptionText, OptionValue);
}

function clearOptionsList(OptionList) {
    for (x = OptionList.length; x >= 0; x = x - 1) {
        OptionList[x] = null;
    }
}

function skalScannes() {
	if($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt1') {
		return mottakerEnheter.toSentralScanner;
	}
	return false;
}

function hasLocalOffices() {
    return mottakerEnheter.offices.length > 0;
}

function submitForm() {
    $("#NAVvedleggsveilederContainer").hide();
    $("#NAVvedleggsveilederDownloadContainer").show();
    $(document).scrollTop(0);
    window.location.hash = "dwnl";
    var args = $('#formgenerator').serialize();
    var url = $('#formgenerator').attr('action');
	$("#NAVvedleggsveilederDownloadContainer").load(url + '?' + args + ' #NAVvedleggsveilederContainer', function() {
	    $('#tilbakeLenke').click(function() {
		goBack();
		return false;
	    });
	});
}

function showErrorMessage(text) { 
	if($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt1') {
		$('#errorBoxZip p').text(text);
		$('#errorBoxZip').show();
	} else if ($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt2') {
	    $('#errorBoxZip2 p').text(text);
	    $('#errorBoxZip2').show();
	}
	else if ($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt3') {
	    $('#fnrUtlandError p').text(text);
	    $('#fnrUtlandError').show();
	}
}

function clearErrorMessages() {
    $('#userDetails .NAVerrorBox').hide();
}

function checkPostalNumber() {
var zipCode = '';
	if($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt1') {
	    zipCode = $('#postnummer').val();
	    if (zipCode.length == 4) {
	        $.post(postNrCheckUrl,$('#formgenerator').serialize(), function(json) {
	            mottakerEnheter = json;
	            if (mottakerEnheter.toSentralScanner && hasLocalOffices()) {
	                $("#userIdNumber").show().find('input.dob').addClass('required');
	            } else {	          
	                $("#userIdNumber").hide().find('input.dob').removeClass('required');
	                if (mottakerEnheter.offices.length > 1) {
	                    clearOptionsList(document.formgenerator.enhetsvalg);
	                    for (n in mottakerEnheter.offices) {		                   
	                  
	                   if (mottakerEnheter.offices[n].hasOwnProperty('name')) { // jslint
	                        var office = mottakerEnheter.offices[n];
	                        addToOptionList(document.formgenerator.enhetsvalg, office.name, office.id);
	                       }
	                    }
	                    $("#enhetsSelectBox").show();
	                    $("#selectEnhet").val(mottakerEnheter.offices[0].id);
	                } else if (mottakerEnheter.offices.length === 1) {
	                    $("#localOffice").attr("value", mottakerEnheter.offices[0].id);
	                }
	            }

	            clearErrorMessages();
	        }, 'json');
	    }
	}
	else if($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt2') {
		zipCode = $('#visitPnr').val();
		if(zipCode.length == 4) {
			$.post(postNrCheckUrl,$('#formgenerator').serialize(), function(json) {
	            mottakerEnheter = json;
				if(mottakerEnheter.offices.length >= 1) {
					$("#localOffice").attr("value", mottakerEnheter.offices[0].id);
				}
				clearErrorMessages();
			}, 'json');
		} else {
			$("#localOffice").attr("value", null);
	        mottakerEnheter = null;
		}
	}
    return false;
}

function checkBirthNumber(birthNumber) {
    if (birthNumber.length == 11 && birthNumber != '00000000000') {
        $.post(fodselsNrValidatorUrl, { param : birthNumber },
                function(data) {
                    correctBirthNumber = data == 'true'; // success
                }, 'text'); // datatype
    } else {
        correctBirthNumber = false;
    }

}

function checkOrgNumber(orgNumber) {
    if (orgNumber.length == 9) {
        $.post(orgNrValidatorUrl, { param : orgNumber },
                function(data) {
                    correctOrgNumber = data == 'true';
                }, 'text' );
    } else {
        correctOrgNumber = false;
    }
}

function checkFodselsEllerOrgnr() {
    var fodselsellerorgnr = $('#fodselsellerorgnr').val();
    if (fodselsellerorgnr.length == 9) {
        $.post(orgNrValidatorUrl, { param : fodselsellerorgnr },
                function(data) {
                    correctFodselsellerorgnr = data == 'true';
                }, 'text');
    } else if (fodselsellerorgnr.length == 11) {
        $.post(fodselsNrValidatorUrl, { param : fodselsellerorgnr },
                function(data) {
                    correctFodselsellerorgnr = data == 'true';
                }, 'text');
    } else {
        correctFodselsellerorgnr = false;
    }
}


function checkUserInputs(active) { // Continuing validation (relevant input fields only)
var userZipExpression = /^[0-9]{4}$/;
$('.required', active).each(function(){ // validate required fields upon submit
   var input = $(this);
   if ($(input).hasClass('postalcode')) {  // POSTNUMMER
       var validated =  $(input).val().match(userZipExpression);
            if (!validated) {
            $(input).not('.invalidfield').addClass('invalidfield'); // invalidfield
            showErrorMessage("Postnummer er ikke gyldig");
            }

            else if (validated && mottakerEnheter !== null && !hasLocalOffices()) {
             showErrorMessage("Finner ikke lokalkontor for dette postnummeret");
              $(input).not('.invalidfield').addClass('invalidfield'); // invalidfield
             }
            
             else if (validated && mottakerEnheter === null) {          
            $(input).not('.invalidfield').addClass('invalidfield'); // No answer received from app
            window.setTimeout(function () {
                    if (mottakerEnheter === null) {
                    showErrorMessage("En feil har oppstått. Prøv igjen.");
                 }
                 else {
                 // is not null anymore // try again
                 if (mottakerEnheter.hasOwnProperty('offices')) { 
                 $('form#formgenerator').submit();
                 }
                 }
             }, 500);
            //return false;
         }
            
            else {
            $(input).removeClass('invalidfield'); // Good to go!
            }
   }// Postnummer end  
   
   if ($(input).hasClass('text')) { // TEXT INPUTS  
   var trimmedText = $.trim($(input).val());
   if (!trimmedText.length > 0) {
            $(input).not('.invalidfield').addClass('invalidfield'); // invalidfield
           var firstInvalidField = $('.invalidfield:first').attr('id');
           var firstInvalidFieldLabel = $("label[for="+firstInvalidField+"]").text();
           showErrorMessage("Du må fylle ut feltet for " + firstInvalidFieldLabel.toLowerCase() ); 
   }
   else {
   $(this).removeClass('invalidfield');
   }    
   } // text end
   
   if ($(input).hasClass('dob')){ // FØDSELSNUMMER 
    if (($(this).val().length === 11) && correctBirthNumber) { //OK
        $(this).removeClass('invalidfield');
    }
    else { // ugyldig
        $(this).not('.invalidfield').addClass('invalidfield');
        showErrorMessage("Ugyldig fødselsnummer");  
    } 
   }// fødselsnummer end   
}); // each end



 if (!$('.invalidfield').length > 0) {   
           submitForm();           
          }
}// checkUserInputs() & validation functions end



function changeValue(newValue) {
    $("#localOffice").attr("value", newValue);
}

function hasOption(select, optionValue) {
    var options = select.children("option[value='" + optionValue + "']");
    return options.size() > 0;
}

function goToUserDetails() {
	window.location.hash = "adr";
	$(document).scrollTop(0);
}

function changeAttachmentPreviewLanguage(key, lang) {
    var selector = "#" + "attachmentPreview-" + key;
    $(selector).attr('href', $(selector).attr('href').replace(/fcLang=\d+/, 'fcLang=' + lang));
}

$(document).ready(function() {

    $('form#formgenerator input[type=text]').keypress(function(e){
    var pressedKey = (e.keyCode ? e.keyCode : e.which);
    if (pressedKey == 13) {
    return false;
    }
    });

	/*  Progressbar */
	if (window.location.hash == "#dwnl") {
		$('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps);
		$('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps));
		showInnsendingsveilederSteg5();
	} else if (window.location.hash == "#adr") {
		$('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 1);
		$('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps -1));
		showInnsendingsveilederSteg4();
	} else {
		$('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 2);
		$('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps -2));
		showInnsendingsveilederSteg3();
	}
	
    $(window).bind('hashchange', function(e) {
		if ($.param.fragment() === '') {
			$('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 2);
			$('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps - 2));
			showInnsendingsveilederSteg3();		
        }
		else if ($.param.fragment() == 'adr' ){
			$('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 1);
			$('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps - 1));
			showInnsendingsveilederSteg4();
		}
		else if ($.param.fragment() == 'dwnl'){
			$('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps);
			$('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps));
			showInnsendingsveilederSteg5();
		}
    });

    // Autocomplete
    if ($('input.excase').is(':checked')) {
		$(this).parents('.definerelation').siblings('div.navdepartment').show();
	}
					
	$('input.excase').click(function(){
	if ($(this).is(':checked')) { $(this).parents('.definerelation').siblings('div.navdepartment').show(); }
	else { $(this).parents('.definerelation').siblings('div.navdepartment').hide(); }
	});
					
	$('.definerelation input[type=radio]:not(.excase)').click(function(){
	$(this).parents('.definerelation').siblings('div.navdepartment').hide().find('input.ac_input').attr('value', '');
	});
	
	//Autocomplete NAV-enhet
	$('input.selectednavdepartment').autocomplete(autocompleteUrl, {
	   selectFirst: false,
	   minChars: 2,
	   cacheLength: 500,
	   extraParams: { 
		limit: '15',
		timestamp: ''
		}
	});
	
	// Selecting atttachments
    if (!$(".velgBoks").checked) {
        $(".velgBoks").siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', true);
    }

    $(".velgBoks").click(function() {
        var attachment = $(this).parents("div.attachment");
        var attachmentBody = attachment.children(".text-wrapper").children(".attachmentbody");

        if (this.checked && attachmentBody.is(":hidden")) {
            attachment.find(".toggleAttachmentBody").click();
        }
        else if (!this.checked && attachmentBody.is(":not(:hidden)")) {
            // slideUp when deselecting checkbox
            attachment.find(".toggleAttachmentBody").click();
            attachmentBody.slideUp('fast');
        }

        if (!this.checked) {
            $(this).siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', true);
            $(this).parent().find('input[type=checkbox][checked]').attr('checked', false);
        }
        else {
            $(this).siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', false);
        }
        // Toggle attachment background color
         if (!$(this).parent('.NAVskjemaIndre').hasClass('checked')) {
            $(this).parent('.NAVskjemaIndre').addClass('checked');       
        } else { $(this).parent('.NAVskjemaIndre').removeClass('checked');}
    });
   
    $(".toggleAttachmentBody").click(function(e) {
        var attachment = $(this).parents("div.attachment").children(".text-wrapper").children(".attachmentbody");
        var src = $(this).attr('src');

        if (attachment.is(':hidden')) {
            attachment.slideDown('fast');
            $(this).attr('src', src.replace('apne', 'lukk'));
			$(this).attr('alt', 'Klikk her for å sjule mer informasjon');
        } else {
            attachment.slideUp('fast');
            $(this).attr('src', src.replace('lukk', 'apne'));
			$(this).attr('alt', 'Klikk her for mer informasjon');
        }

        e.preventDefault();
    });
	
	
	
	//Find address	
		$(".toggleAddressBody").click(function(e) {
		var address = $(this).parents("div.addressInfo").children(".addressinputbody");
		var src = $(this).attr('src');
		var siblings = $(this).parents('.NAVskjemaIndre').siblings();

	        if (address.is(':hidden')) {
			address.slideDown('fast');
			$(this).attr('src', src.replace('apne', 'lukk'));
			$(this).attr('alt', 'Klikk her for å sjule adresseinformasjon');
			siblings.find('.addressinputbody').slideUp();
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
	
	$(".velgAdrSituation").click(function() {
	        var address = $(this).parents("div.addressInfo");
	        var addressinputbody = address.children(".addressinputbody");

	        if (this.checked && addressinputbody.is(":hidden")) {
	            address.find(".toggleAddressBody").click();
	        }
	        if (!$(this).parents('.NAVskjemaIndre').hasClass('checked')) {
	            $(this).parents('.NAVskjemaIndre').addClass('checked');
				$(this).parents('.NAVskjemaIndre').siblings().removeClass('checked');
	           return true;
	        }
	});

	$('.velgAdrSituation:checked').click(); // Open checked "tab" on page reload
	
    // preview icon rollover
    $('img.preview').hover(function() {
        $(this).attr('src', $(this).attr('src').split('-70.').join('-100.'));
    }, function() {
        $(this).attr('src', $(this).attr('src').split('-100.').join('-70.'));
    });
       
    $("#mainFormLang").change(function() { /*Kun i innsending*/
        var chosenLang = $(this).val();
        $("#mainFormPreview").attr('href', $("#mainFormPreview").attr('href').replace(/fcLang=\d+/, 'fcLang=' + chosenLang));
        $("select[name$='-lang']").each(function() {
            if (hasOption($(this), chosenLang)) {
                $(this).val(chosenLang);
            } else {
                // Om man har valgt nynorsk eller samisk defualt til bokm?l
                if (chosenLang == '54' || chosenLang == '152') {
                    if (hasOption($(this), '53')) {
                        $(this).val('53');
                    }
                } else {
                    if (hasOption($(this), '64')) {
                        $(this).val('64');
                    }
                }
            }
            var key = $(this).attr('name').split("-")[0];
            chosenLang = $(this).val();
            changeAttachmentPreviewLanguage(key, chosenLang);
        });
    });

    $("select[name$='-lang']").change(function() {
        var key = $(this).attr('name').split("-")[0];
        var chosenLang = $(this).val();
        changeAttachmentPreviewLanguage(key, chosenLang);
    });

    // Display ajax-loader.gif, then remove it after x sec.
    $('.form-details input.NAVbtn').click(function() {
        if (!$('span#dwnload-confirmation-msg').hasClass('ajax-loader')) {
            $('span#dwnload-confirmation-msg').addClass('ajax-loader');
        }
        window.setTimeout(function() {
            $('span#dwnload-confirmation-msg').removeClass('ajax-loader');
        }, 5000);
    });

    // Innsending og VALIDERING
    checkPostalNumber(); // check zipCode on page reload
    $("#postnummer, #visitPnr").bind('keyup', function(e) {
       var userZipExpression = /^[0-9]{4}$/;
       var zipCode = $(this).val();
       if (zipCode.length == 4 && zipCode.match(userZipExpression)) {
        checkPostalNumber();
        } else {
            $("#userIdNumber").hide();
            $("#enhetsSelectBox").hide();
            $("#localOffice").attr("value", null);
            mottakerEnheter = null;
        }
    });	
      $("#userDetails input.dob").attr("autocomplete", "off").keyup(function(e) {    
        if ($(this).val().length === 11) {     
        checkBirthNumber($(this).val());
        }
    });
    $("#orgnr").keyup(function(e) {
        checkOrgNumber($(this).val());
    });
    $("#fodselsellerorgnr").keyup(function(e) {
        checkFodselsEllerOrgnr();
    });
    $("#org").attr("autocomplete", "off");
    
    // SUBMIT form
    $('form#formgenerator').submit(function() {
    clearErrorMessages();    
    var active = $('input[name=situation]:checked:first').parents('.NAVskjemaIndre.addressInfo'); // To be validated
    var notActive = $(active).siblings('.addressInfo'); // To be cleared
    $('input[type=text]',notActive).attr('value', ''); // Clearing all unused (irrelevant) inputs
    $('.invalidfield',notActive).removeClass('invalidfield'); // Cancel all errors in irrelevant fields
    $("#enhetsSelectBox", notActive).hide(); // Hide selectbox (if multiple offices)
    
    if (! active.length > 0){
            $('#missingaddresserrormsg').show(); 
            return false; // stopp!
           } 
    
    else {
    checkUserInputs(active);
    }

    return false;
    }); // submit function end
    
}); // jquery document ready end