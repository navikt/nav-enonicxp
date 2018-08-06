var mottakerEnheter = null;
var correctBirthNumber = false;
var correctOrgNumber = false;
var correctFodselsellerorgnr = false;


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

function goDirectlyToDownload(URL) {
$("#formgenerator").attr("action", URL);
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

function goToDownload() {
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
function goToUserDetailsEttersendelseArbeidsgiver() {
    window.location.hash = "adr";
    checkCategory();
    $(".skjema2011form-details").show();
    $("#downloadbutton").show();
    $("#skjema2011-schemaAndAttachment").hide();
    $("#NAVskjema2011DownloadContainer").hide();
    $(document).scrollTop(0);
}

 $(".velgAdrSituation").click(function () {
     clearErrorMessages();

        var address = $(this).parents("div.addressInfo");
        var addressinputbody = address.children(".addressinputbody");
       
        if (this.checked && addressinputbody.is(":hidden")) {
            address.find(".toggleAddressBody").click();
        }
    });


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

    $('.addressInfo').click(function() {
	 
        if (!$(this).hasClass('checked')) {
            $(this).addClass('checked');
            $(this).siblings().removeClass('checked');
            return true;
        }
    });
	
$(document).ready(function() {

 setChosenNavUnit(); 
 
addAutocomplete($('#navUnitMultiple'), $("#chosennavunit"), $("#navUnitMultipleSelected"), $("#navUnitMultipleSelectedChangeButton"));
addAutocomplete($('#navUnitOrg'), $("#chosennavunit"), $("#navUnitOrgSelected"), $("#navUnitOrgSelectedChangeButton"));
addAutocomplete($('#excaseNAVKontor'), $("#chosennavunit"), $("#excaseNAVKontorSelected"), $("#excaseNAVKontorSelectedChangeButton"));
addAutocomplete($('#navdepartment1'), $("#chosennavunit"), $("#navdepartment1Selected"), $("#navdepartment1SelectedChangeButton"));

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
				$(".userinputsection").show();
                $("#skjema2011-schemaAndAttachment").hide();
                $(document).scrollTop(0);
            }
    $(".attachmentbody").hide();
    $(".addressinputbody").hide();
  

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

}); // jQuery document ready