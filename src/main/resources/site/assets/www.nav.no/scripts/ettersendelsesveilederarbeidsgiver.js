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
    $('#steg_i_innsendingsveileder li.vedleggsveileder' + vedleggsveilederSteg).removeClass('selected');
    vedleggsveilederSteg = steg;
    $('#steg_i_innsendingsveileder li.vedleggsveileder' + vedleggsveilederSteg).addClass('selected');
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
    history.go(-1);
    $("#NAVvedleggsveilederContainer").show();
    $("#NAVvedleggsveilederDownloadContainer").hide();
    moveStepIndicatorForInnsendingsveileder(2);
}

function goDirectlyToDownload() {
    $('form#formgenerator').submit();
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

function finnAdresseEttersendelseInit() {
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

    // Autocomplete
    if ($('input.excase').is(':checked')) {
        $(this).parents('.definerelation').siblings('div.navdepartment').show();
    }

    $('input.excase').click(function() {
        if ($(this).is(':checked')) {
            $(this).parents('.definerelation').siblings('div.navdepartment').show();
        } else {
            $(this).parents('.definerelation').siblings('div.navdepartment').hide();
        }
    });

    $('.definerelation input[type=radio]:not(.excase)').click(function() {
        $(this).parents('.definerelation').siblings('div.navdepartment').hide().find('input.ac_input').attr('value', '');
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
}

function changeSelectedNavUnitOrg() {
    $("#navUnitOrgSelectedChangeButton").hide();
    $("#navUnitOrgSelected").text('');
    $("#navUnitOrgSelected").hide();
    $("#navUnitOrg").val('');
    $("#navUnitOrg").show();
}

function changeSelectedNavUnitMultiple() {
    $("#navUnitMultipleSelectedChangeButton").hide();
    $("#navUnitMultipleSelected").text('');
    $("#navUnitMultipleSelected").hide();
    $("#navUnitMultiple").val('');
    $("#navUnitMultiple").show();
}

$(document).ready(function() {
    finnAdresseEttersendelseInit();
    $(".attachmentbody").hide();
    $(".addressinputbody").hide();
    $(".moreaddressoptions").hide();

    $('form#formgenerator input[type=text]').keypress(function(e) {
        var pressedKey = (e.keyCode ? e.keyCode : e.which);
        if (pressedKey == 13) {
            return false;
        }
    });

    // preview icon rollover
    $('img.preview').hover(function() {
            $(this).attr('src', $(this).attr('src').split('-70.').join('-100.'));
        },
        function() {
            $(this).attr('src', $(this).attr('src').split('-100.').join('-70.'));
        });

    // Find address
    /*$(".toggleAddressBody").click(function(e) {
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
    });*/

    $(".address-selection input[name = hasfrontpage]").click(function(e) {
        var thisParent = $(this).parents('.userinputsection');
        var eaddress = $(this).parents('.userinputsection').children('.moreaddressoptions');
        var eimg = $(this).siblings('img.toggleAddressBody');
        var esiblings = $(this).parents('.userinputsection').siblings();
        if (eaddress.is(':hidden')) {
            eaddress.slideDown('fast');
            $(eimg).attr('src', $(eimg).attr('src').replace('apne', 'lukk'));
            $(eimg).attr('alt', 'Klikk her for å skjule adresseinformasjon');
            esiblings.find('.moreaddressoptions').slideUp();
            esiblings.find('.toggleAddressBody').each(function() {
                $(this).attr('src', $(this).attr('src').replace('lukk', 'apne'));
                $(this).attr('alt', 'Klikk her for å gi inn adresseinformasjon');
            });
        }
        if (!$(thisParent).hasClass('checked')) {
            $(thisParent).addClass('checked');
            $(thisParent).siblings().removeClass('checked');
            // return true;
        }
    });

    $(".NAVselectAddressStatus input[name = situation]").click(function(e) {
        var inneraddress = $(this).parents('.addressInfo').children('.addressinputbody');
        var innersiblings = $(this).parents('.addressInfo').siblings();
        if (inneraddress.is(':hidden')) {
            inneraddress.slideDown('fast');
        }
        innersiblings.find('.addressinputbody:visible').slideUp();
    });

    $(".velgAdrSituation").click(function() {
        clearErrorMessages();
        var address = $(this).parents("div.addressInfo");
        var addressinputbody = address.children(".addressinputbody");

        if (this.checked && addressinputbody.is(":hidden")) {
            address.find(".toggleAddressBody").click();
        }
    });

    $('.addressInfo').click(function() {
        if (!$(this).hasClass('checked')) {
            $(this).addClass('checked');
            $(this).siblings().removeClass('checked');
            return true;
        }
    });

    $('input[name = hasfrontpage]:checked').click(); // open "tab" on page reload
    $('input.velgAdrSituation:checked').click();

    // Display ajax-loader.gif, then remove it after x sec.
    $('.form-details input.NAVbtn').click(function() {
        if (!$('span#dwnload-confirmation-msg').hasClass('ajax-loader')) {
            $('span#dwnload-confirmation-msg').addClass('ajax-loader');
        }
        window.setTimeout(function() {
                $('span#dwnload-confirmation-msg').removeClass('ajax-loader');
            },
            5000);
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
}); // jQuery document ready