// --------------- nytt -------------------//

$(function () {

    $('#klage-ris-ros-skjema').on('submit', function (e) {
        
        var isValidated = validateInput(e);
        
        if (isValidated) {
          $("#velgNavEnhet").val("");
          return true;
        }
        else {
          return false;
        }

    });

});

// --------------- gammelt -----------------//


/*var validateInputArray = new Array; // renamet fra validateInput

function validate(form) {

    console.log('func validate(form)');

    var status = true;
    for (var i = 0; i < form.length; i++) {
        if (validateInputArray[form.elements[i].name]) {
            if (!validateInputArray[form.elements[i].name].pattern.test(Trim(form.elements[i].value))) {
                document.getElementById("msg_" + form.elements[i].name).innerHTML = validateInputArray[form.elements[i].name].error;
                document.getElementById("row_" + form.elements[i].name).style.display = "inline";
                form.elements[i].className = form.elements[i].className + " error";
                status = false;
            } else {
                var cls = form.elements[i].className;
                if (cls.indexOf('error') > 0) {
                    cls = cls.substring(0, cls.indexOf(' error'));
                }
                form.elements[i].className = cls;
                document.getElementById("row_" + form.elements[i].name).style.display = "none";
            }
        }
    }
    return status;
}*/

function Trim(strValue) {
    return LTrim(RTrim(strValue));
}

function LTrim(strValue) {
    var LTRIMrgExp = /^\s*/;
    return strValue.replace(LTRIMrgExp, '');
}

function RTrim(strValue) {
    var RTRIMrgExp = /\s*$/;
    return strValue.replace(RTRIMrgExp, '');
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

// Tilbakemelding.js:

function validateInput(e) {

    clearErrorMessages();
    var errorOccured = false;

    errorOccured = validerBeskrivelsesFelt();

    if (isTilbakemelding()) {
        errorOccured = errorOccured | validerEpostFelt();
    } else if (isKlagePaaService()) {
        errorOccured = errorOccured | validerPersonnummerFelt() | validerOrgnr(e) | validerValgtEnhet() | validerRequired();
    } else if (isRos()) {
        errorOccured = errorOccured | validerValgtEnhet();
    }

    if (errorOccured) {
        return false;
    }
    else {
      return true;
    }
}

function validerRequired() {
    $("form input.required").each(function () {
        var input = $(this);
        var trimmedText = $.trim($(input).val());
        if (trimmedText.length > 0) {
            input.siblings('.formgroup-error').hide();
            return false;
        } else {
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
    if (isTextAreaEmpty($.trim($("#beskrivelse").val()))) {
        beskrivelseErrorMsg = '<p>Tilbakemeldingsfeltet er ikke fylt ut</p>';
    }

    if (beskrivelseErrorMsg != '') {
        beskrivelseErrorMsg = '<a name="scrollTop">&nbsp;</a><div class="NAVerrorBox">' + beskrivelseErrorMsg + '</div>';
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
        if (epost != '') {
            AtPos = epost.indexOf("@");
            StopPos = epost.lastIndexOf(".");

            if (AtPos == -1 || StopPos == -1) {
                epostErrorMsg = '<p>E-postadressen er ikke gyldig </p>';
            }
        }

        if (epostErrorMsg != '') {
            epostErrorMsg = '<a name="scrollTop">&nbsp;</a><div class="NAVerrorBox">' + epostErrorMsg + '</div>';
            $(".epostError").html(epostErrorMsg);
            $(".epostError").show();
            return true;
        }
        return false;
    }
}

function validerPersonnummerFelt() {
    if ($("#klagerPersonnummer").length) {
        var pNrErrorMsg = '';

        var fnr = $("#klagerPersonnummer").val();
        if (fnr.length != 11 || isNaN(fnr)) {
            pNrErrorMsg = '<p>Fødselsnummer skal bestå av 11 siffer</p>';
        } else if (!(validateFnr(fnr))) {
            pNrErrorMsg = '<p>Fødselsnummer er ikke gyldig</p>';
        }

        if (pNrErrorMsg != '') {
            pNrErrorMsg = '<div class="NAVerrorBox">' + pNrErrorMsg + '</div>';
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

function validerOrgnr(e) {
    //e.preventDefault();
    
    if ($('#orgnr').length) {
        var orgNrFormat = /^[0-9]{9}$/;
        var orgNr = $('#orgnr').val();
        var orgNrErrorMsg = '<div class="NAVerrorBox"><p>Organisasjonsnummer skal bestå av ni siffer</p></div>';

        if (!orgNr.match(orgNrFormat)) {
            $('.orgnrError').html(orgNrErrorMsg).show();
            e.preventDefault();
            return false;
            
        } else if (orgNr.match(orgNrFormat)) {
            orgMod11(orgNr, e);
        } else {
            e.preventDefault();
            return false;
        }
    }
}

function orgMod11(orgNr, e) {
    var factor = [3, 2, 7, 6, 5, 4, 3, 2], productSum = 0, remainer = 0, controlDigit = 0;
    for (var i = 0; i < 8; i++) {
        productSum += orgNr[i] * factor[i];
    }
    remainer = productSum % 11;
    controlDigit = (remainer === 0) ? 0 : 11 - remainer;
    if (remainer !== 1 && controlDigit === parseInt(orgNr[8], 10)) {
        return true;
    } else {
        orgNrErrorMsg = '<div class="NAVerrorBox"><p>Organisasjonsnummer er ugyldig</p></div>';
        $('.orgnrError').html(orgNrErrorMsg).show();
        e.preventDefault();
        return false;
    }
}

function validerValgtEnhet() {
    var enhetErrorMsg = '';
    if ($("#navEnhetValgt").text() == '') {
        enhetErrorMsg = '<p>Du har ikke valgt NAV-kontor. Velg fra forslagslisten som dukker opp når du taster</p>';
    }

    if (enhetErrorMsg != '') {
        enhetErrorMsg = '<a name="scrollTop">&nbsp;</a><div class="NAVerrorBox">' + enhetErrorMsg + '</div>';
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
    if ($("input[name='subject']").val() == 'Ros') {
        $("input[name='to']").val(defaultEpostadresse);
    }
}

function imposeMaxLength(Event, object, maxLen) {
    if (object.value.length > maxLen) {
        object.value = object.value.substring(0, maxLen);
    }
    var gjenstaar = maxLen - object.value.length;
    $("span#gjenstaar").text(gjenstaar);
    return (object.value.length <= maxLen) || (Event.keyCode == 8 || Event.keyCode == 46 || (Event.keyCode >= 35 && Event.keyCode <= 40));
}

function textareaInit() {
    if ($("#beskrivelse").val() === beskrivelseInitText) {
        $("#beskrivelse").addClass("defaultText");
    } else {
        $("#beskrivelse").removeClass("defaultText");
    }
}

function nullstill() {
    if (!isTilbakemelding()) {
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

$(function () {
    $('#typeofservice').change(function () {
        if ($(this).val() === 'other') {
            $('#othertypeofservice').parent('div').show();
        } else {
            $('#othertypeofservice').val('').parent('div').hide();
        }
    });
});

// stod inline i XSL
$(function () {
    
    var inputAc = $('#Enhet'),
        inputAcError = $(".enhetError"),
        selectedDep = $("#navEnhetValgt"),
        defaultEpostadresse = $("input[name='to']").val(); // brukes av ros

    textareaInit();
    selectedDep.text('');
    inputAcError.hide();
    $(".beskrivelseError").hide();
    $(".pnrError").hide();

    $(".epostError").hide(); // feil og mangler nav.no

    if (typeof updateSubjectField !== 'undefined') {
        populateSubjectFieldWithSelectedCategory(); // kun for feil og mangler nav.no
    }

    inputAc.autocomplete({

        source: function (request, response) {
      
            request.term = request.term.replace(/æ/g, "%C3%A6");
            request.term = request.term.replace(/ø/g, "%C3%B8");
            request.term = request.term.replace(/å/g, "%C3%A5");
            request.term = request.term.replace(/Æ/g, "%C3%86");
            request.term = request.term.replace(/Ø/g, "%C3%98");
            request.term = request.term.replace(/Å/g, "%C3%85");
		
            $.get(autocompleteUrl + '?term=' + request.term, function (data) {
                if (data) {
                    response(JSON.parse(data));
                }
            });
        },
        minLength: 2,
        delay: 400,
        select: function (event, ui) {
            inputAc.val(ui.item.value); // #chosennavunit
            selectedDep.text(ui.item.label).show(); // #navdepartment1Selected - labellelement
            $("#velgNavEnhetChangeButton").show();
            inputAc.hide();
            inputAcError.html("");
        },
        focus: function (event, ui) {
            event.preventDefault();
            inputAc.val(ui.item.label);
        }
    });
});
