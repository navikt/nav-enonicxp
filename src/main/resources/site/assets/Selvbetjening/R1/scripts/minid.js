/*
Dette scriptet er avhengig av at korrekte miljøvariabler er satt opp. 
Følgende variabler må defineres:

var ajaxAuthService = "http://e11apvl055.utv.internsone.local:9080/nav-sbl-felles-innloggingslinje/auth";
var authenticatedUrls = [
      {publicUrl:'/sbl/loginBoks.do$', authenticatedUrl:'https://tjenester-sso-t.adeo.no/federation/UI/Login?goto=http://u3-www.adeo.no:8100/sbl/nav_security_check'},
      {publicUrl:'/dineutbetalinger/$', authenticatedUrl:'http://e11apvl055.utv.internsone.local:9080/dineutbetalinger/login.jsp?_id43=Logg+inn'}
   ];
var logoutUrl = "http://e11apvl1055.utv.internsone.local:9080/nav-sbl-felles-innloggingslinje/auth";

*/

if(typeof ajaxAuthService == 'undefined') {
	alert('Miljøvariabler har ikke blitt konfigurert');
}

/**
 * Sjekker om bruker er autentisert.
 *
 * Viser/Skjuler toppbaren avhengig av om brukeren er autentisert eller ikke.
 *
 * Håndterer klikk i venstremenyen.
 * Dersom bruker er innlogget sendes han direkte inn i applikasjonen,
 * hvis ikke sendes han til innloggingsside.
 */
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

   var authenticate = function(jsonp) {
      if (typeof jsonp != 'undefined') {
         responseHandlerOK(jsonp);
      } else {
		var randomness = '?randomness=' + Math.random()*1000000;
		jsonpScript = document.createElement('script');
		jsonpScript.src = ajaxAuthService + 'p' + randomness;
		jsonpScript.type = 'text/javascript';
		document.lastChild.firstChild.appendChild(jsonpScript);
      }
   };
   
   var logout = function() {
	window.location = logoutUrl;
   }

   var responseHandler = function() {
      if (NAVStatusAJAX.readyState == 4 && NAVStatusAJAX.status == 200)
      {
         var json = eval('(' + NAVStatusAJAX.responseText + ')');
         responseHandlerOK(json);
      }
      else if (NAVStatusAJAX.readyState == 4 && NAVStatusAJAX.status != 200) {
      }
   };

   var responseHandlerOK = function(response) {
      var isAuth = response.authenticated;
      if (isAuth) {
         onAuthenticated(response);
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

   /**
    * Håndterer lenkeklikk for bruker.
    *
    * Videresender brukeren til sikkerhetssjekken dersom brukeren allerede er innlogget med MinID.
    * @param anchor Anchor som har blitt klikket på.
    */
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

   var setName = function(name)
   {
	  var innloggingsStatus;
	  if(name == '') {
		innloggingsStatus = "Du er logget inn med MinID";
	  } else {
		innloggingsStatus = "Du er logget inn som " + name;
	  }
      document.getElementById('innloggetBruker').innerHTML = innloggingsStatus;
   };

   var slideDown = function() {
      var timeToSlide = 750; // in milliseconds
      var height = 195;
	  var animValues = calculateAnimationSteps(height, timeToSlide);
      var obj = document.getElementById(navLoginComponent);
      obj.style.visibility = "hidden";
      obj.style.display = "block";
      obj.style.position = "relative";
      obj.style.height = "0px";
      obj.style.visibility = "visible";
	  var cover = document.getElementById(navCoverComponent);
	  cover.style.display = "block";
	  size = 'full';
      slideDownAnim(obj, 0, height, animValues.pixelstep, animValues.timestep);
	  setTimeout((function() {
         slideBack();
      }), 8750);
   };

   var slideUp = function() {
      var timeToSlide = 750; // in milliseconds
	  var animValues = calculateAnimationSteps(35, timeToSlide);
      var obj = document.getElementById(navLoginComponent);
      slideUpAnim(obj,45,0, animValues.pixelstep, animValues.timestep);
   };
   
   /**   
	* Flytter innloggingslinjen tilbake til normal størrelse, etter at den har vært ekspandert til full størrelse.
	*/
   var slideBack = function() {
      if(size == 'full') {
		  size = 'normal';
		  var timeToSlide = 500; // in milliseconds
		  var animValues = calculateAnimationSteps(195, timeToSlide);
	      var obj = document.getElementById(navLoginComponent);
		  var cover = document.getElementById(navCoverComponent);
		  cover.style.display = "none";
	      slideUpAnim(obj,195,45, animValues.pixelstep, animValues.timestep);
	  }
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
	  slideBack: slideBack,
      onAuthenticated:onAuthenticated,
      onNotAuthenticated:onNotAuthenticated
   };
})();


/**
* Logikk for å vise innlogget linje på applikasjonen dersom brukeren ikke er logget inn på min id via federation manager.
*/
var ApplikasjonsStatuslinje = (function() {
var shouldShow = false; 
 
   var show = function() {
   shouldShow = true;
      var appLoginComponent = document.getElementById("loginContainer");
	  if(appLoginComponent != null)
	  {
		appLoginComponent.style.display = "block";
		
	  }
   };
   
	var delayedShow = function() {
      var appLoginComponent = document.getElementById("loginContainer");
	  if(appLoginComponent != null && shouldShow)
	  {
		appLoginComponent.style.display = "block";
	  }
   };   
   
 return {
      show:show,
	  delayedShow:delayedShow
   };
 
})();


/**
 * Enkelt verktøy for håndtering av sidenavigasjon
 */
var NavigationUtil = {
   navigateTo: function(target) {
      window.location = target;
   }
};

/**
 * Verktøy for å manipulere url-er i DOM
 */
var UrlUtil = {};

/**
 * Bytter alle forekomster av en url i DOM-en.
 *
 * Gammel url trenger ikke å være fullstendig.
 *
 * @param gammelUrl
 * @param nyUrl
 */
UrlUtil.byttEn = function (gammelUrl, nyUrl) {
   var anchors = document.getElementsByTagName("a");
   for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      if (anchor.getAttribute("href").indexOf(gammelUrl) > -1) {
         anchor.setAttribute("href", nyUrl);
      }
   }
};

/**
 * Bytter ett sett med url-er.
 *
 * Input: Array med url-sett med gammel og ny url.
 * Eksempel: [{gammel:'http://gammel.url', ny:'http://ny.url'}]
 *
 * @param urls array med url-sett
 */
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
      } catch(e) {
      }
      try {
         return new ActiveXObject("Msxml2.XMLHTTP.3.0")
      } catch(e) {
      }
      try {
         return new ActiveXObject("Msxml2.XMLHTTP")
      } catch(e) {
      }
      try {
         return new ActiveXObject("Microsoft.XMLHTTP")
      } catch(e) {
      }
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
      //	setTimeout((function(){doSlide('NAVstatusInfo');}),2000);

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