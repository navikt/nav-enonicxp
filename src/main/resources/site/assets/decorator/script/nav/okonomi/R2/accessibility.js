var msIEversion;
if (window.navigator.appName == "Microsoft Internet Explorer") {
    if (document.documentMode) {
        msIEversion = document.documentMode;
    } else {
        msIEversion = 5;
        if (document.compatMode) {
            if (document.compatMode == "CSS1Compat") {
                msIEversion = 7;
            }
        }
    }
}

function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}


(function() {
    var cookie = readCookie('contrast');    
    if (cookie === 'contrast') {
     var body = document.getElementsByTagName("body")[0];     
     body.setAttribute(msIEversion < 8? "className": "class", 'font_normal ' + cookie)
    }   
})();

if (typeof jQuery !== 'undefined') {
$(function() {
    // fontsize
    $('#skriftstr').click(function(e){
        e.preventDefault();
    });
    
    $('#skriftstr').bind('hover focus', function(){
        if (navigator.appVersion.toLowerCase().indexOf('mac') !== -1) {
            $(this).find('.key').text('cmd');
        }
    });
    
    // constrast
    $('#hoykontrast > a').click(function(e){
        e.preventDefault();
        $('body').toggleClass('contrast');
    });   
    $(window).unload(function() {
        if ($('body').hasClass('contrast')) {
            createCookie('contrast', 'contrast', 365);
        }
        else {
        createCookie('contrast',"",-1);
        }
    });
});
}