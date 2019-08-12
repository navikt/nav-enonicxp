$(function setup () {
    var interval = setInterval(function () {
        if (document.querySelectorAll('.intelecomsubmit.icon.intelecomchaticon-right').length !== 0) {
            var buttonClassList = document.querySelectorAll('.intelecomsubmit.icon.intelecomchaticon-right');
            buttonClassList[0].innerText = 'Send';
            document.querySelectorAll('.intelecomchatdialog')[0].style.cssText = 'min-width: 300px; min-height: 500px; left: 809.5px; top: 112.5px; width: 600px; height: 500px;';
            clearInterval(interval);
        }
    }, 10);
});
$(document).ready(function Chat () {
    $('#chat').intelecomChat({
        /* Se dokumentasjon fra Puzzel for en oversikt over tilgjengelige parametre. */
        customerKey: '41155',
        queueKey: 'q_Chat_Familieytelser',
        timeId: '20173_time10',
        startTextFromBottom: true,
        onContactCenterClosed: function () {
            document.getElementById('infomelding').classList.remove('usynlig');
        },
        startChatImmediately: true, // will start chat when page load
        useTracker: false,
        showStarter: false, // displays the chat starter circle
        horizontalChatPosition: 'center', // positions the chat window
        verticalChatPosition: 'middle', // positions the chat window
        draggable: false, // enables user to move window
        languageCode: 'NO', // language settings (EN, NO, SE, DK, FI, HU, BG)
        showSendEmail: true,
        fromEmailDisplayName: 'NAV Kontaktsenter',
        emailSubject: 'Chat-referat',
        emailPreText: 'Hei,[br] her er referatet fra din chatsamtale med oss:',
        emailPostText: 'Takk for din henvendelse.[br][br]Hilsen,[br] NAV Kontaktsenter',
        emailBottomLineColor: '#c30000',
        emailLogoUrl: 'https://www.nav.no/_public/beta.nav.no/images/logo.png?_ts=1512923c9b0',
        emailLogoAlt: 'NAV',
        resizable: false,
        onChatWindowClose: function () { window.close(); },
    });
});
$(window).on('resize', function testFunction () {
    setTimeout(function () {
        var chatStyle = document.querySelectorAll('.intelecomchatdialog')[0].style.cssText = 'min-width: 300px; min-height: 500px; left: 809.5px; top: 112.5px; width: 600px; height: 500px;';
    }, 10);
});
