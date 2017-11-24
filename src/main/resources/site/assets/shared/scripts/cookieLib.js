/*

DISCLAIMER: THESE JAVASCRIPT FUNCTIONS ARE SUPPLIED 'AS IS', WITH
NO WARRANTY EXPRESSED OR IMPLIED. YOU USE THEM AT YOUR OWN RISK.
NEITHER PAUL STEPHENS NOR PC PLUS MAGAZINE ACCEPTS ANY LIABILITY FOR
ANY LOSS OR DAMAGE RESULTING FROM THEIR USE, HOWEVER CAUSED.

Paul Stephens' NetScape-based cookie-handling library

http://web.ukonline.co.uk/paul.stephens/index.htm

TO USE THIS LIBRARY, INSERT ITS CONTENTS IN A <script></script> BLOCK IN THE
<HEAD> SECTION OF YOUR WEB PAGE SOURCE, BEFORE ANY OTHER JAVASCRIPT ROUTINES.

Feel free to use this code, but please leave this comment block in.

*/

function setCookie (name, value, lifespan, access_path, domain) {
//var cookietext = name + "=" + escape(value);
var cookietext = name + "=" + encodeURIComponent(value);
if (lifespan != null) {
  var today=new Date()
  var expiredate = new Date()
  expiredate.setTime(today.getTime() + 1000*60*60*24*lifespan)
  cookietext += "; expires=" + expiredate.toGMTString()
}
if (access_path != null) {
  cookietext += "; PATH="+access_path
}
if (domain != null) {
  cookietext += "; DOMAIN="+domain
}
document.cookie = cookietext
return null
}


function setDatedCookie(name, value, expire, access_path) {
//var cookietext = name + "=" + escape(value)
var cookietext = name + "=" + encodeURIComponent(value)
   + ((expire == null) ? "" : ("; expires=" + expire.toGMTString()))
if (access_path != null) {
  cookietext += "; PATH="+access_path
}
document.cookie = cookietext
return null
}


function getCookie(Name) {
var search = Name + "="
var CookieString = document.cookie
var result = null
if (CookieString.length > 0) {
    offset = CookieString.indexOf(search)
    if (offset != -1) {
        offset += search.length
        end = CookieString.indexOf(";", offset)
        if (end == -1) {
           end = CookieString.length }
        result = unescape(CookieString.substring(offset, end))
   }
}
return result
}


function deleteCookie(Name, Path, Domain) {
	setCookie(Name,"Deleted", -1, Path, Domain)
}

function setSubject()
{
	var selCat = document.getElementById('selectCategory');
	var selectedCat = selCat.options[document.getElementById('selectCategory').selectedIndex].innerHTML;
	document.getElementById("subject").setAttribute("value", selectedCat);
}


function submitCheck(){
	setSubject();
		
}

/* END OF FUNCTIONS */