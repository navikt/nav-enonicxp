//Set styling based on securityLevel of user
$(function () {
    if (typeof navno.securityLevel === 'undefined') {
        hideDittNavMenuSetLogin();
    } else {
        setLockedClassOnInaccessibleMenuElements();
        setCorrectSecLevelUpgradeInfoText(navno.securityLevel);
    }
});

function setLockedClassOnInaccessibleMenuElements() {
    $('a[data-sec-level]').each(function() {
        //If secLevel of the menu is larger than users secLevel set locked class for styling
        if (this.getAttribute("data-sec-level") > navno.securityLevel) {
            $(this).addClass("locked");
            $(this).attr("aria-label", "Låst: ");
        };
    });
}

function hideDittNavMenuSetLogin() {
    $('a[data-sec-level]').first().closest("ul.subnavitems").addClass("hidden");
    $('a[data-sec-level]').first().closest("div").find('div.tilbaketilgruppe').addClass("hidden");
    $('a[data-sec-level]').first().closest("div").children("div.submenu-logg-inn").removeClass("hidden");
}

function setCorrectSecLevelUpgradeInfoText(securityLevel) {
    if (securityLevel < 4) {
        $('.secLevelUpgradeInfo').removeClass("hidden");
        if (securityLevel === 3) {
            $('.secLevel3Info').removeClass("hidden");
            $('.secLevel3Info').removeAttr("aria-hidden");
        } else {
            $('.secLevel2Info').removeClass("hidden");
            $('.secLevel2Info').removeAttr("aria-hidden");
        }
    }
}

//////////////////////// END ////////////////////////

/* Set same height for titles in the global menu */

$(function () {
    $("li.topnavitem").each(function() {
        var maxUndertittelhoyde = 0 ;
        var undertitler = $(this).find("h2.globalmenu-tittel");
        undertitler.each(function() {
            maxUndertittelhoyde = Math.max($(this).height(), maxUndertittelhoyde);
        });
        undertitler.each(function() {
            $(this).height(maxUndertittelhoyde);
        })
    });
});

//////////////////////// END ////////////////////////

/* Plassering av hjelpetekstboks for paalogging til hoeyere sikkerhetsnivaa */

$(function() {
    $("#globalmenu-upgrade-info-button").click(function() {
        var tooltip = $("#globalmenu-upgrade-info-tooltip")[0];
        var tooltipbuttonOffset = $("#globalmenu-upgrade-info-button").offset();
        var leftPosition = tooltipbuttonOffset.left - $(tooltip).width() + 21;
        var topPosition = tooltipbuttonOffset.top - $(tooltip).height() - 34;

        $(tooltip).offset({
            top: topPosition,
            left: leftPosition
        });
    });
});

//////////////////////// END ////////////////////////
