Effect.OpenUp = function(element) {
     element = $(element);
     new Effect.BlindDown(element, arguments[1] || {});
 }

 Effect.CloseDown = function(element) {
     element = $(element);
     new Effect.BlindUp(element, arguments[1] || {});
 }

 Effect.Combo = function(element) {
     element = $(element);
     if(element.style.display == 'none') { 
          new Effect.OpenUp(element, arguments[1] || {}); 
     }else { 
          new Effect.CloseDown(element, arguments[1] || {}); 
     }
 }
 
 function rullgardin(element) {
	element = $(element);
	Effect.Combo(element, { duration: .2 }); 
 }

function changeIconToActive(imgID, imgSrc) {
	var prefix = $(imgID).src.substring(0, ($(imgID).src.indexOf("/bilder/searchpage/") + "/bilder/serachpage/".length));
    $(imgID).src = prefix + imgSrc + "selected.gif";
}
	
function changeIcontoInactive(imgID, imgSrc) {
	var prefix = $(imgID).src.substring(0, ($(imgID).src.indexOf("/bilder/searchpage/") + "/bilder/serachpage/".length));
    $(imgID).src = prefix + imgSrc + ".gif";
}
