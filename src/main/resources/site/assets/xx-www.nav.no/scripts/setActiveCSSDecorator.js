var msIEversion;
if (window.navigator.appName == "Microsoft Internet Explorer") {
   if (document.documentMode)
      msIEversion = document.documentMode;  // IE8
   else // IE 5-7
   {
      msIEversion = 5; // Assume quirks mode unless proven otherwise
      if (document.compatMode)
      {
         if (document.compatMode == "CSS1Compat")
            msIEversion = 7; // standards mode
      }
   }
}

function changeFontSize() {
	var body = document.getElementsByTagName('body')[0];
	//Look for className (IE7 / IE8 compat mode) or class
	var bodyClass = body.getAttribute('className') || body.getAttribute('class'); 
	
	if (bodyClass.indexOf('largest') != -1) {
		bodyClass = bodyClass.replace('largest', 'normal');		
		body.setAttribute(msIEversion < 8  ? 'className' : 'class', bodyClass);  //Set className for IE
	} else if (bodyClass.indexOf("normal") != -1) {
		bodyClass = bodyClass.replace('normal', 'large');
		body.setAttribute(msIEversion < 8  ? 'className' : 'class', bodyClass); 
	} else {
		bodyClass = bodyClass.replace('large', 'largest');
		body.setAttribute(msIEversion < 8 ? 'className' : 'class', bodyClass); 
	}
}
function setFontSize(size) {
//Sett inn sjekk og ta vare på 'contrast' hvis satt
    var keepContrast = '';
	var body = document.getElementsByTagName('body')[0];
	var bodyClass = body.getAttribute('className') || body.getAttribute('class');
	if (bodyClass.indexOf('contrast') != -1) {
	keepContrast = ' contrast';
	}
    body.setAttribute(msIEversion < 8  ? 'className' : 'class', 'font_' + size + keepContrast);
}

function changeContrast() {
	var body = document.getElementsByTagName('body')[0];
	var bodyClass = body.getAttribute('className') || body.getAttribute('class'); //IE7
	if (bodyClass.indexOf('contrast') == -1) {
		bodyClass += ' contrast';
		body.setAttribute(msIEversion < 8  ? 'className' : 'class', bodyClass);
	} else 
	   { // Turn off contrast
		bodyClass = bodyClass.replace('contrast', '');
		body.setAttribute(msIEversion < 8  ? 'className' : 'class', bodyClass);
	}	
}

function setActiveStyleSheet(contrast, fontsize) {
	if (contrast == 'empty') {
		contrast = '';
	} else {
		contrast = ' ' + contrast;
	}
	var body = document.getElementsByTagName('body')[0];
	var bodyClass = 'font_' + fontsize + contrast;
	body.setAttribute(msIEversion < 8  ? 'className' : 'class', bodyClass);
}

function getActiveContrast() {
	var body = document.getElementsByTagName('body')[0];
    var bodyClass = body.getAttribute('className') || body.getAttribute('class'); //IE7
	if (bodyClass.indexOf('contrast') == -1) {
		return 'empty';
	} else {
		return 'contrast';
	}
}

function getActiveFontsize() {
	var body = document.getElementsByTagName('body')[0];
    var bodyClass = body.getAttribute('className') || body.getAttribute('class'); 
	if (bodyClass.indexOf('largest') != -1) return 'largest'
	else if (bodyClass.indexOf('large') != -1) return 'large'
	else return 'normal'
}

function createCookie(name, value, days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		var expires = "; expires=" + date.toGMTString();
	}
	else expires = "";
	document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}


window.onunload = function(e) {
	var contrast = getActiveContrast();
	var fontsize = getActiveFontsize();
	createCookie('contrast', contrast, 365);
	createCookie('fontsize', fontsize, 365);
}


var cookiec = readCookie("contrast");
var contrast = cookiec ? cookiec : 'empty'
var cookief = readCookie("fontsize");
var fontsize = cookief ? cookief : 'normal'
setActiveStyleSheet(contrast, fontsize);

