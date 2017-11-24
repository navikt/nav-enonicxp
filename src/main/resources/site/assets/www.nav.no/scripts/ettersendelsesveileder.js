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
    $(".dob").val('');// remove identity upon loading
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
    if (totalCount == 5 && currentPosition == 3) {
        return "Du er på steg 3 av 5; Kryss av for vedlegg";
    } else if (totalCount == 3 && currentPosition == 1) {
        return "Du er på steg 1 av 3; Kryss av for vedlegg";
    } else if ((totalCount == 5 && currentPosition == 4) || (totalCount == 3 && currentPosition == 2)) {
        return "Du er på steg " + currentPosition + " av " + totalCount + "; Finn adresse";
    } else if ((totalCount == 5 && currentPosition == 5) || (totalCount == 3 && currentPosition == 3)) {
        return "Du er på steg " + currentPosition + " av " + totalCount + "; Last ned";
    }
}

function goBack() {
    history.go(- 1);
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
    if ($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt1') {
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
    var args = $('#formgeneratorettersendelse').serialize();
    var url = $('#formgeneratorettersendelse').attr('action');
        
    $("#NAVvedleggsveilederDownloadContainer").load(url + '?' + args + ' #NAVvedleggsveilederContainer', function () {
        $('#tilbakeLenke').click(function () {
            goBack();
            return false;
        });
    });
}

function showErrorMessage(text) {
    if ($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt1') {
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
    if ($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt1') {
        zipCode = $('#postnummer').val();
        if (zipCode.length == 4) {
            $.post(postNrCheckUrl, $('#formgeneratorettersendelse').serialize(), function (json) {
                mottakerEnheter = json;
                if (mottakerEnheter.toSentralScanner && hasLocalOffices()) {
                    $("#userIdNumber").show().find('input.dob').addClass('required');
                } else {
                    $("#userIdNumber").hide().find('input.dob').removeClass('required');
                    if (mottakerEnheter.offices.length > 1) {
                        clearOptionsList(document.formgeneratorettersendelse.enhetsvalg);
                        for (n in mottakerEnheter.offices) {
                        if (mottakerEnheter.offices[n].hasOwnProperty('name')) { // jslint
                            var office = mottakerEnheter.offices[n];
                            addToOptionList(document.formgeneratorettersendelse.enhetsvalg, office.name, office.id);
                            }
                        }
                        $("#enhetsSelectBox").show();
                        $("#selectEnhet").val(mottakerEnheter.offices[0].id);
                    } else if (mottakerEnheter.offices.length == 1) {
                        $("#localOffice").attr("value", mottakerEnheter.offices[0].id);
                    }
                }
                
                clearErrorMessages();
            },
            'json');
        }
    } else if ($('.addressInfo.checked').find('input[name="situation"]').val() == 'alt2') {
        zipCode = $('#visitPnr').val();
        if (zipCode.length == 4) {
            $.post(postNrCheckUrl, $('#formgeneratorettersendelse').serialize(), function (json) {
                mottakerEnheter = json;
                if (mottakerEnheter.offices.length >= 1) {
                    $("#localOffice").attr("value", mottakerEnheter.offices[0].id);
                }
                clearErrorMessages();
            },
            'json');
        } else {
            $("#localOffice").attr("value", null);
            mottakerEnheter = null;
        }
    }
    return false;
}

function checkBirthNumber(birthNumber) {
    if (birthNumber.length === 11 && birthNumber != '00000000000') {
        $.post(fodselsNrValidatorUrl, { param: birthNumber},
        function (data) {
            correctBirthNumber = data == 'true';             
        },
        'text');
    } else {
        correctBirthNumber = false;       
    }   
}

function checkOrgNumber(orgNumber) {
    if (orgNumber.length == 9) {
        $.post(orgNrValidatorUrl, {
            param: orgNumber
        },
        function (data) {
            correctOrgNumber = data == 'true';
        },
        'text');
    } else {
        correctOrgNumber = false;
    }
}

function checkFodselsEllerOrgnr() {
    var fodselsellerorgnr = $('#fodselsellerorgnr').val();
    if (fodselsellerorgnr.length == 9) {
        $.post(orgNrValidatorUrl, {param: fodselsellerorgnr},
        function (data) {
            correctFodselsellerorgnr = data == 'true';
        },
        'text');
    } else if (fodselsellerorgnr.length == 11) {
        $.post(fodselsNrValidatorUrl, {param: fodselsellerorgnr},
        function (data) {
            correctFodselsellerorgnr = data == 'true';
        },
        'text');
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
           var firstInvalidFieldLabel = $("'label[for="+firstInvalidField+"]'").text();
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
}// checkUserInputs() end

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
    $(selector).attr('href', $(selector).attr('href').replace(/ fcLang = \d + /, 'fcLang=' + lang));
}

$(document).ready(function () {    
    $("#userIdNumber").hide();
    $("#enhetsSelectBox").hide();
    $(".attachmentbody").hide();
    $(".addressinputbody").hide();
    $(".moreaddressoptions").hide();
    
    $('form#formgeneratorettersendelse input[type=text]').keypress(function(e){
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
        $('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps - 1));
        showInnsendingsveilederSteg4();
    } else {
        $('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 2);
        $('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps - 2));
        showInnsendingsveilederSteg3();
    }
    
   $(window).bind('hashchange', function (e) {
        if ($.param.fragment() === '') {
            $('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 2);
            $('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps - 2));
            showInnsendingsveilederSteg3();
        } else if ($.param.fragment() == 'adr') {
            $('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps - 1);
            $('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps - 1));
            showInnsendingsveilederSteg4();
        } else if ($.param.fragment() == 'dwnl') {
            $('#steg_i_innsendingsveileder ul').attr('aria-valuenow', numberOfSteps);
            $('h1#steg_header, p#steg_header_info').text(getAvailabilityText(numberOfSteps, numberOfSteps));
            showInnsendingsveilederSteg5();
        }
    });

    // selecting attachments
    if (! $(".velgBoks").checked) {
        $(".velgBoks").siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', true);
    }
    
        $(".velgBoks").click(function () {
        var attachment = $(this).parents("div.attachment");
        var attachmentBody = attachment.children(".text-wrapper").children(".attachmentbody");
        
        if (this.checked && attachmentBody.is(":hidden")) {
            attachment.find(".toggleAttachmentBody").click();
        } else if (! this.checked && attachmentBody.is(":not(:hidden)")) {
            // slideUp when deselecting checkbox
            attachment.find(".toggleAttachmentBody").click();
            attachmentBody.slideUp('fast');
        }
        
        if (! this.checked) {
            $(this).siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', true);
            $(this).parent().find('input[type=checkbox][checked]').attr('checked', false);
        } else {
            $(this).siblings('div .attachmentbody').find('input[type=checkbox]').attr('disabled', false);
        }
        
          // Toggle attachment background color
        if (! $(this).parent('.NAVskjemaIndre').hasClass('checked')) {
            $(this).parent('.NAVskjemaIndre').addClass('checked');
        } else {$(this).parent('.NAVskjemaIndre').removeClass('checked');}
    });
    
        $(".toggleAttachmentBody").click(function (e) {
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
  
  
    // preview icon rollover
    $('img.preview').hover(function () {
        $(this).attr('src', $(this).attr('src').split('-70.').join('-100.'));
    },
    function () {
        $(this).attr('src', $(this).attr('src').split('-100.').join('-70.'));
    });
  
  // Find address
   $(".toggleAddressBody").click(function (e) {
        var address = $(this).parents("div.userinputsection ").children(".moreaddressoptions");
        var src = $(this).attr('src');
        var siblings = $(this).parents('.NAVskjemaIndre').siblings();
        
        if (address.is(':hidden')) {
            address.slideDown('fast');
            $(this).attr('src', src.replace('apne', 'lukk'));
            $(this).attr('alt', 'Klikk her for å sjule adresseinformasjon');
            siblings.find('.moreaddressoptions').slideUp();
            siblings.find('.toggleAddressBody').each(function () {
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
    $(".address-selection input[name = hasfrontpage]").click(function (e) {   
        var thisParent = $(this).parents('.userinputsection');
        var eaddress = $(this).parents('.userinputsection').children('.moreaddressoptions');
        var eimg = $(this).siblings('img.toggleAddressBody');
        var esiblings = $(this).parents('.userinputsection').siblings();       
        if (eaddress.is(':hidden')) {
            eaddress.slideDown('fast');
            $(eimg).attr('src', $(eimg).attr('src').replace('apne', 'lukk'));
            $(eimg).attr('alt', 'Klikk her for å skjule adresseinformasjon');
            esiblings.find('.moreaddressoptions').slideUp();
            esiblings.find('.toggleAddressBody').each(function () {
                $(this).attr('src', $(this).attr('src').replace('lukk', 'apne'));
                $(this).attr('alt', 'Klikk her for gi inn adresseinformasjon');
            });
        }
        if (! $(thisParent).hasClass('checked')) {
            $(thisParent).addClass('checked');
            $(thisParent).siblings().removeClass('checked');
           // return true;
        }
    });
    
    $(".NAVselectAddressStatus input[name = situation]").click(function (e) {
        var inneraddress = $(this).parents('.addressInfo').children('.addressinputbody');
        var innersiblings = $(this).parents('.addressInfo').siblings();        
        if (inneraddress.is(':hidden')) {
            inneraddress.slideDown('fast');
        }
        innersiblings.find('.addressinputbody:visible').slideUp();
    });
      
    $(".velgAdrSituation").click(function () {
        var address = $(this).parents("div.addressInfo");
        var addressinputbody = address.children(".addressinputbody");
        
        if (this.checked && addressinputbody.is(":hidden")) {
            address.find(".toggleAddressBody").click();
        }
    });
       
    $('.addressInfo').click(function () {
        if (! $(this).hasClass('checked')) {
            $(this).addClass('checked');
            $(this).siblings().removeClass('checked');
            return true;
        }
    });
    
    $('input[name = hasfrontpage]:checked').click(); // open "tab" on page reload
    $('input.velgAdrSituation:checked').click();
            
    // Display ajax-loader.gif, then remove it after x sec.
    $('.form-details input.NAVbtn').click(function () {
        if (! $('span#dwnload-confirmation-msg').hasClass('ajax-loader')) {
            $('span#dwnload-confirmation-msg').addClass('ajax-loader');
        }
        window.setTimeout(function () {
            $('span#dwnload-confirmation-msg').removeClass('ajax-loader');
        },
        5000);
    });
     
   /*Innsending & VALIDERING!*/ 
    checkPostalNumber(); // check zipCode on page reload
    $("#postnummer, #visitPnr").bind('keyup', function (e) {
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
    $("#orgnr").keyup(function (e) {      
        checkOrgNumber($(this).val());
    });
    $("#fodselsellerorgnr").keyup(function (e) {       
        checkFodselsEllerOrgnr();
    });        
    $("#org").attr("autocomplete", "off");
        
    // SUNMIT form    
    $('form#formgeneratorettersendelse').submit(function () {
        clearErrorMessages(); // hide previous stated errormsgs
        
        if ($('#alt1').is(':checked')) {
            $('.userinputsection:not(.checked) input[type=text]').attr('value', ''); // Clearing all irrelevant text inputs before submit
            submitForm();
        } 
        
        else if ($('#alt2').is(':checked')) { // Test2 start
            var self = $('#alt2').parents('.userinputsection.checked').children('.moreaddressoptions'); // scope. Alt under her skal valideres.
            var active = $(self).find('input[type=radio]:checked:first').parents('.addressInfo'); // This one is to be validated        
            
            if (! active.length > 0){
            $('#missingaddresserrormsg').show(); 
            return false; // stopp!
            }            
            var notActive = $(active).siblings('.addressInfo');        
            $('input[type=text]',notActive).attr('value', ''); // Clearing all unused (irrelevant) inputs
            $('.invalidfield',notActive).removeClass('invalidfield'); // Cancel all errors in irrelevant fields
            checkUserInputs(active);
        } // test2 end 

        else { // test3
            $('#frontpageerrormsg').show();
          }
       
        return false; // Prevent submit!
    });
}); // jQuery document ready