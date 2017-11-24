if(typeof ajaxAuthService == 'undefined') {
   alert('Miljøvariabler har ikke blitt konfigurert');
}

var AuthenticationUtil = (function() {
   var authenticated = false;
   
   var findAuthenticatedUrl = function(originalUrl) {
      for (var i = 0; i < authenticatedUrls.length; i++) {
         var urlSet = authenticatedUrls[i];
         if (originalUrl.search(urlSet.publicUrl) > -1) {
            return urlSet.authenticatedUrl;
         }
      }
      return undefined;
   };

   var NAVStatusAJAX = new XMLHttpRequest();
   var authenticate = function() {
      if(window.location.protocol == "https:") {
        var protocol = 'https';
        var host = window.location.host;         
		var path = ajaxAuthService + '/auth?randomness=' + Math.random()*1000000;         
		
		try {
		   NAVStatusAJAX.open('GET', protocol + '://' + host + '/' + path, false);
		   NAVStatusAJAX.send(null);

		   if (NAVStatusAJAX.readyState == 4 && NAVStatusAJAX.status == 200) {
			  var json = JSON.parse(NAVStatusAJAX.responseText);
			  responseHandlerOK(json);
		   }
		} catch (e) {
		   onNotAuthenticated();
		}

      } 
   }
  
   var logout = function() {   
      window.location = logoutUrl;
   }

   var responseHandlerOK = function(response) {
	var isAuth = response.authenticated;
	  
    if (isAuth){	  
		var authLevel = response.securityLevel;
		if(authLevel > 2) {
			onAuthenticated(response);		 
		} else {
			onNotAuthenticated();
		}
    } else {
		onNotAuthenticated();
	}
   };

   var onAuthenticated = function(response) {
      authenticated = true;
      MinIDStatuslinje.onAuthenticated(response.name);
   };

   var onNotAuthenticated = function() {
      authenticated = false;
      MinIDStatuslinje.onNotAuthenticated();
   };

   var reset = function() {
      authenticated = false;
   };

   var isAuthenticated = function() {
      return authenticated;
   };

   var onClick = function(anchor) {
      if (authenticated) {
         var originalUrl = anchor.getAttribute('href');
         var authenticatedUrl = findAuthenticatedUrl(originalUrl);
         if (authenticatedUrl != undefined) {
            NavigationUtil.navigateTo(authenticatedUrl);
            return false;
         }
      }
   };

   return {
      authenticate:authenticate,
      logout:logout,
      onAuthenticated:onAuthenticated,
      onClick:onClick,
      isAuthenticated:isAuthenticated,
      reset:reset
   };
})();

var MinIDStatuslinje = (function() {
   var navLoginComponent = 'NAVstatus';
   var navCoverComponent = 'NAVcover';
   var navTopbarIindicator = 'TOPBAR';
   var visible = false;
   var size = 'none';
   
   var init = function() {
      visible = false;
      if (getCookie(navTopbarIindicator)) {
         this.show();
         visible = true;
      } else {
         this.hide();
       ApplikasjonsStatuslinje.show();
      }
   };

   var onAuthenticated = function(name) {
      this.setName(name);
      if (!visible) {
         var hostname = window.location.hostname;
         hostname = hostname.substring(hostname.indexOf('.')+1);     
         setCookie(navTopbarIindicator, "true", 1000 * 60 * 30, "/", hostname );
         visible = true;
         this.slideDown();
      }
   };

   var onNotAuthenticated = function() {
      if (visible) {
         var hostname = window.location.hostname;
         hostname = hostname.substring(hostname.indexOf('.')+1);
         deleteCookie(navTopbarIindicator,"/",hostname);
		 
         visible = false;
         this.slideUp();
      }
      ApplikasjonsStatuslinje.show();
   };

   var show = function() {
      document.getElementById(navLoginComponent).style.display = "block";
   };

   var hide = function() {
      document.getElementById(navLoginComponent).style.display = "none";
   };

   var setName = function(name) {
      if(name != '') {
         document.getElementById('innloggetBruker').innerHTML = name.toLowerCase();
         document.getElementById('innloggetBruker').style.display = 'inline';
      }
   };

   var slideDown = function() {
      var timeToSlide = 1750; // in milliseconds
      var height = 45;
      var animValues = calculateAnimationSteps(height, timeToSlide);
      var obj = document.getElementById(navLoginComponent);
      obj.style.visibility = "hidden";
      obj.style.display = "block";
      obj.style.position = "relative";
      obj.style.height = "0px";
      obj.style.visibility = "visible";
      size = 'normal';
      slideDownAnim(obj, 0, height, animValues.pixelstep, animValues.timestep);
   };

   var slideUp = function() {
      var timeToSlide = 750; // in milliseconds
      var animValues = calculateAnimationSteps(35, timeToSlide);
      var obj = document.getElementById(navLoginComponent);
      slideUpAnim(obj,45,0, animValues.pixelstep, animValues.timestep);
   };
   
   var calculateAnimationSteps = function(height, timeToSlide) {
     var smallestTimeStep = 50; // in milliseconds
     var nrOftimesteps = (timeToSlide/smallestTimeStep);
     var timestep = Math.ceil(nrOftimesteps/height)*smallestTimeStep;
     var pixelstep = Math.ceil(height / nrOftimesteps );
     return {timestep: timestep, pixelstep:pixelstep };
   } 

   return {
      init:init,
      show:show,
      hide:hide,
      setName:setName,
      slideDown:slideDown,
      slideUp:slideUp,
      onAuthenticated:onAuthenticated,
      onNotAuthenticated:onNotAuthenticated
   };
})();


var ApplikasjonsStatuslinje = (function() {
var shouldShow = false; 
 
   var show = function() {
   shouldShow = true;
      var appLoginComponent = document.getElementById("loginContainer");
      if (appLoginComponent != null) {
         appLoginComponent.style.display = "block";
      }
   };
   
   var delayedShow = function() {
      var appLoginComponent = document.getElementById("loginContainer");
      if(appLoginComponent != null && shouldShow) {
         appLoginComponent.style.display = "block";
      }
   };   
   
   return {
      show:show,
      delayedShow:delayedShow
   };
})();


var NavigationUtil = {
   navigateTo: function(target) {
      window.location = target;
   }
};

var UrlUtil = {};

UrlUtil.byttEn = function (gammelUrl, nyUrl) {
   var anchors = document.getElementsByTagName("a");
   for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      if (anchor.getAttribute("href").indexOf(gammelUrl) > -1) {
         anchor.setAttribute("href", nyUrl);
      }
   }
};

UrlUtil.byttMange = function (urls) {
   for (var i = 0; i < urls.length; i++) {
      var urlset = urls[i];
      this.byttEn(urlset.publicUrl, urlset.authenticatedUrl);
   }
};


//from json-simple: http://code.google.com/p/json-simple
function createXMLHttpRequest() {
   // See http://en.wikipedia.org/wiki/XMLHttpRequest
   // Provide the XMLHttpRequest class for IE 5.x-6.x:
   if (typeof XMLHttpRequest == "undefined") XMLHttpRequest = function() {
      try {
         return new ActiveXObject("Msxml2.XMLHTTP.6.0")
      } catch(e) {}
      try {
         return new ActiveXObject("Msxml2.XMLHTTP.3.0")
      } catch(e) {}
      try {
         return new ActiveXObject("Msxml2.XMLHTTP")
      } catch(e) {}
      try {
         return new ActiveXObject("Microsoft.XMLHTTP")
      } catch(e) {}
      //Fail silently! alternative: //throw new Error( "This browser does not support XMLHttpRequest." )
   };
   return new XMLHttpRequest();
}

var NAVStatusAJAX = createXMLHttpRequest();

function slideDownAnim(obj, offset, full, px, timestep) {
   if (offset < full) {
      obj.style.height = offset + "px";
      offset = offset + px;
      setTimeout((function() {
         slideDownAnim(obj, offset, full, px);
      }), timestep);
   } else {
      obj.style.height = full + "px";
   }
}

function slideUpAnim(obj, offset, full, px, timestep) {
   if (offset > full) {
      obj.style.height = offset + "px";
      offset = offset - px;
      setTimeout((function() {
         slideUpAnim(obj, offset, full, px);
      }), timestep);
   } else {
      obj.style.height = full + "px";
   }
}