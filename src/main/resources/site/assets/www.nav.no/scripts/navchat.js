var navChat = window.navChat || {};
//navChat.responsePic;
navChat.showSpinner = true;
navChat.status = 0; // offline 1, online 2, busy 3
navChat.counter = 1;
navChat.origin = document.location;
navChat.winUrl = 'https://login.edialog24.com/cmd?op=ENTRYPOINTCLICK&mainid=A477&epname=NAV__1277&orgname=NAV &e24em=&e24fn=&e24ln=&e24ph=&e24mo=&location=' + navChat.origin;
navChat.winName = 'ed24Login';
navChat.winFeatures = 'width=532,height=515,resizable=no,scrollbars=no';

navChat.loadStatusMsg = function (responsePic) {
    var prevStatus = navChat.status; 
    navChat.status = responsePic.width ? responsePic.width : 1;   // current status
     
    if (navChat.status !== prevStatus) { // status changed
        $('.chatwrapper .ajaxspinner').show();
        if (navChat.status === 2) {
            $('#chatstatus').load(navChat.statusMsgUrl + ' #chatonline', function() {
             $('.chatwrapper .ajaxspinner').hide();
            });
        } 
        else if (navChat.status === 3) {
            $('#chatstatus').load(navChat.statusMsgUrl + ' #chatbusy', function() {
             $('.chatwrapper .ajaxspinner').hide();
            });
        }
        else {
            $('#chatstatus').load(navChat.statusMsgUrl + ' #chatoffline', function() {
             $('.chatwrapper .ajaxspinner').hide();
            });
        }
    }   
}

navChat.checkStatus = function () {
    var date = new Date();
    var time = date.getTime();
    
    var responsePic = new Image();
    responsePic.src = "http://login.edialog24.com/cmd?OP=ENTRYPOINTSTATUS&amp;mainid=A477&amp;epname=NAV__1277&amp;t=" + navChat.counter +"&amp;uq=" + time;
    responsePic.onload = function (evt) {
        navChat.loadStatusMsg(responsePic);
    }
    $(responsePic).error(function () {
        navChat.loadStatusMsg(responsePic);
    });
    navChat.counter ++;
    setTimeout(navChat.checkStatus, 15000);
}

$(function () {
    navChat.checkStatus();
    $('a.edialog').live('click', function (e) {
        // Open chat window
        e.preventDefault();
        window.open(navChat.winUrl, navChat.winName, navChat.winFeatures);
        //return false;
    });
});