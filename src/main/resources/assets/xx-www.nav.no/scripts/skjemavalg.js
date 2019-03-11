var mottakerEnheter = null;
var validinput = true;
var validfnr = false;

function gotoSelectVedlegg() {
    $("#skjema2011-schemaAndAttachment").show();
    $(".skjema2011form-details").hide();
    $("#NAVskjema2011DownloadContainer").hide();
    $(".vedleggsveileder1").addClass("selected");
    $(".vedleggsveileder2").removeClass("selected");
    $(".vedleggsveileder2").addClass("waiting");
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 3 av 5; Kryss av for vedlegg");
}

function changeAttachmentPreviewLanguage(key, lang) {
    var selector = "#" + "mainFormPreview-" + key;
    $(selector).attr('href', $(selector).attr('href').replace(/fcLang=\d+/, 'fcLang=' + lang));
}

function goToUserDetailsArbeidsgiver() {
    window.location.hash = "adr";
    checkCategory();
    $(".skjema2011form-details").show();
    $("#downloadbutton").show();
    $("#skjema2011-schemaAndAttachment").hide();
    $("#NAVskjema2011DownloadContainer").hide();
    $(document).scrollTop(0);
    $(".vedleggsveileder1").removeClass("waiting");
    $(".vedleggsveileder1").removeClass("selected");
    $(".vedleggsveileder2").addClass("selected");
    $(".vedleggsveileder2").removeClass("waiting");
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 4 av 5; Finn adresse");
}

function goToUserDetailsEttersendelseArbeidsgiver() {
    window.location.hash = "adr";
    checkCategory();
    $(".skjema2011form-details").show();
    $("#downloadbutton").show();
    $("#skjema2011-schemaAndAttachment").hide();
    $("#NAVskjema2011DownloadContainer").hide();
    $(document).scrollTop(0);
    $(".vedleggsveileder1").removeClass("waiting");
    $(".vedleggsveileder1").removeClass("selected");
    $(".vedleggsveileder2").addClass("selected");
    $(".vedleggsveileder2").removeClass("waiting");
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 4 av 5; Finn adresse");
}

function goToUserDetailsPrivatpersonEttersendelse() {
	window.location.hash = "adr";
	$(".skjema2011form-details").show();
	$("#downloadbutton").show();
	$("#skjema2011-schemaAndAttachment").hide();
	$("#NAVskjema2011DownloadContainer").hide();
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
	$('h1#steg_header, p#steg_header_info').text("Du er på steg 4 av 5; Finn adresse");
	
}

function goToUserDetailsPrivatpersonEngelsk() {
    window.location.hash = "adr";
    checkCategory();
    $(".skjema2011form-details").show();
    $("#downloadbutton").show();
    $("#skjema2011-schemaAndAttachment").hide();
    $("#NAVskjema2011DownloadContainer").hide();
    $(document).scrollTop(0);
    $(".vedleggsveileder1").removeClass("waiting");
    $(".vedleggsveileder1").removeClass("selected");
    $(".vedleggsveileder2").addClass("selected");
    $(".vedleggsveileder2").removeClass("waiting");
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 4 av 5; Finn adresse");
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

function goToDownload(skjemaveilederURL) {
//    if ($("input[name='type']").val() == 'ettersendelsearbeidsgiver') {
//        createCookie("skjemaveileder_chosennavunit_ettersendelsearbeidsgiver", $("#navUnitOrgSelected").text(), 0.01);
//    } else {
//    }
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

function goToDownloadSimple() {
    validfnr = false;
    if ($("#navUnitOrgSelected").text() == '') {
        $('#navUnitOrgError').show();
        $('.NAVerrorBoxWrapper').show();
    } else {
        $('form#formgenerator').submit();
    }
}

function hasOption(select, optionValue) {
    var options = select.children("option[value='" + optionValue + "']");
    return options.size() > 0;
}

$(document).ready(function() {
    $('form#formgenerator input[type=text]').keypress(function(e) {
        var pressedKey = (e.keyCode ? e.keyCode : e.which);
        if (pressedKey == 13) {
            return false;
        }
    });

    checkCategory();

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
                // Om man har valgt nynorsk eller samisk defualt til bokmål
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
}); // jquery document ready end