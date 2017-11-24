var mottakerEnheter = null;
var validinput = true;
var validfnr = false;
var validcategory = false;


function showAddressChoices() {

    var chosenSenderSituation = $(".chooseSenderSituation:checked");
    var address = chosenSenderSituation.parents("div.userinputsection");
    var moreaddressoptions = address.find(".moreaddressoptions");
    var siblings = chosenSenderSituation.parents('.NAVskjemaIndre').siblings();

    moreaddressoptions.show();
    moreaddressoptions.slideDown('fast');
    var chosenAddressSituation = $(".velgAdrSituation:checked");
    var addressinfo = chosenAddressSituation.parents("div.addressInfo");
	
    var addressinputbody = addressinfo.find(".addressinputbody");
    addressinputbody.show();
    addressinputbody.slideDown();
    var siblings = addressinfo.siblings();
    siblings.find(".addressinputbody").slideUp();

    if (!$(chosenSenderSituation).parents('.NAVskjemaIndre').hasClass('checked')) {
        $(chosenSenderSituation).parents('.NAVskjemaIndre').addClass('checked');
        $(chosenSenderSituation).parents('.NAVskjemaIndre').siblings().removeClass('checked');
        return true;
    }
}

function togglePanelsPrivatperson() {

    $("#utlandContactEnhetSuggest").hide();
    $("#contactEnhetSuggest").hide();
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 3 av 5; Kryss av for vedlegg");
    $("#notworkinnorwayfnr").val('');

    $("#innorwayfnr").val('');
    $(".addressinputbody").hide();
    if (window.location.hash != '#adr') {
        $(".skjema2011form-details").hide();
        $("#downloadbutton").hide();
        $(".addressinputbody").hide();

    } else {
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

}

function togglePanelsEttersendelse() {
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 3 av 5; Kryss av for vedlegg");

    $("#notworkinnorwayfnr").val('');
    $("#innorwayfnr").val('');
    $(".NAVerrorBoxWrapper").hide();
    $(".moreaddressoptions").hide();

    if (window.location.hash != '#adr') {
        $(".skjema2011form-details").hide();
        $("#downloadbutton").hide();
        $(".addressinputbody").hide();
    } else {
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

function finnAdresseInit() {
    $("#navUnitOrgSelectedChangeButton").hide();
    $("#navUnitMultipleSelectedChangeButton").hide();
    $("#navdepartment1SelectedChangeButton").hide();
    $("#excaseNAVKontorSelectedChangeButton").hide();
    if ($("input[name='hidemoreadressoptions']").val() == 'true') {
		$(".moreaddressoptions").hide();
	}
	
    $("#adralt1").click(function () {
        $("#alt4").attr("checked", false);
        $("#alt5").attr("checked", false);
    });

    $("#alt4").click(function () {
        $("#adralt1").attr("checked", false);
    });

    $("#alt5").click(function () {
        $("#adralt1").attr("checked", false);
    });

    $("#alt6").click(function () {
        $("#chosennavunit").val($("#navofficealt6").val());
    });
    $("#alt7").click(function () {
        $("#chosennavunit").val($("#navofficealt7").val());
    });

    // Autocomplete
    if ($('input.excase').is(':checked')) {
        $(this).parents('.definerelation').siblings('div.navdepartment').show();
    }

    $('input.excase').click(function () {
        if ($(this).is(':checked')) {
            $(this).parents('.definerelation').siblings('div.navdepartment').show();
        } else {
            $(this).parents('.definerelation').siblings('div.navdepartment').hide();
        }
    });

    $('.definerelation input[type=radio]:not(.excase)').click(function () {
        $(this).parents('.definerelation').siblings('div.navdepartment').hide().find('input.ac_input').attr('value', '');
    });
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
    $(".vedleggsveileder1").show();
    $(".vedleggsveileder2").show();
    $(".vedleggsveileder3").show();
    $('h1#steg_header, p#steg_header_info').text("Du er på steg 4 av 5; Finn adresse");
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

function setChosenNavUnit() {
    $("#alt1").click(function () {
        $("#chosennavunit").val("");
    });
	$("#alt1a").click(function () {
        $("#chosennavunit").val("");
    });
	$("#alt1b").click(function () {
        $("#chosennavunit").val("");
    });
    $("#alt2").click(function () {
        $("#chosennavunit").val("");
    });
    $("#alt3").click(function () {
        $("#chosennavunit").val("");
    });
    $("#alt4").click(function () {
        $("#chosennavunit").val("");
    });
    $("#alt5").click(function () {
        $("#chosennavunit").val("");
    });
    $("#alt6").click(function () {
        $("#chosennavunit").val($("#navofficealt6").val());
    });
    $("#alt7").click(function () {
        $("#chosennavunit").val($("#navofficealt7").val());
    });
}

$(document).ready(function () {
   finnAdresseInit();
   
    togglePanelsPrivatperson();
if ($('#excase1').is(':checked')) {
        if (readCookie("skjemaveileder_chosennavunit_privatperson") === '') {
            $('#contactEnhetSuggest').css('display', 'block');
        } else {
            $('#contactEnhetSuggest').css('display', 'block');
            $('#navdepartment1').css('display', 'none');
            $('#navdepartment1Selected').css('display', 'none');
            $('#navdepartment1SelectedChangeButton').css('display', 'inline');
            $('#navdepartment1Selected').text(readCookie("skjemaveileder_chosennavunit_privatperson"));
        }
    }	
	setChosenNavUnit();
	checkCategory();
  
    $('#navdepartment1').val('');
	$('#excaseNAVKontor').val('');
    $("#navUnitMultiple").val('');
	$("#navUnitOrg").val('');

 
    $('form#formgenerator input[type=text]').keypress(function (e) {
        var pressedKey = (e.keyCode ? e.keyCode : e.which);
        if (pressedKey == 13) {
            return false;
        }
    });

    addAutocomplete($('#navUnitMultiple'), $("#chosennavunit"), $("#navUnitMultipleSelected"), $("#navUnitMultipleSelectedChangeButton"));
    addAutocomplete($('#navUnitOrg'), $("#chosennavunit"), $("#navUnitOrgSelected"), $("#navUnitOrgSelectedChangeButton"));
    addAutocomplete($('#excaseNAVKontor'), $("#chosennavunit"), $("#excaseNAVKontorSelected"), $("#excaseNAVKontorSelectedChangeButton"));
    addAutocomplete($('#navdepartment1'), $("#chosennavunit"), $("#navdepartment1Selected"), $("#navdepartment1SelectedChangeButton"));

    // preview icon rollover
    $('img.preview').hover(function () {
        $(this).attr('src', $(this).attr('src').split('-70.').join('-100.'));
    }, function () {
        $(this).attr('src', $(this).attr('src').split('-100.').join('-70.'));
    });

    $("#mainFormLang").change(function () { /*Kun i innsending*/
        var chosenLang = $(this).val();
        $("#mainFormPreview").attr('href', $("#mainFormPreview").attr('href').replace(/fcLang=\d+/, 'fcLang=' + chosenLang));
        $("select[name$='-lang']").each(function () {
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

    $("select[name$='-lang']").change(function () {
        var key = $(this).attr('name').split("-")[0];
        var chosenLang = $(this).val();
        changeAttachmentPreviewLanguage(key, chosenLang);
    });

    // Display ajax-loader.gif, then remove it after x sec.
    $('.form-details input.NAVbtn').click(function () {
        if (!$('span#dwnload-confirmation-msg').hasClass('ajax-loader')) {
            $('span#dwnload-confirmation-msg').addClass('ajax-loader');
        }
        window.setTimeout(function () {
            $('span#dwnload-confirmation-msg').removeClass('ajax-loader');
        }, 5000);
    });
}); // jquery document ready end