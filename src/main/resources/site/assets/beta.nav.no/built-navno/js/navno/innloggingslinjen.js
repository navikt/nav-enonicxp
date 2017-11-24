//////////////////////// END ////////////////////////

var navno = navno || {};
var Innloggingslinje = (function () {

    var SHOULD_SHOW_LOGIN_TOOLTIP = "should_show_login_tooltip";
    var LOGIN_TOOLTIP_HAS_BEEN_SHOWN = "login_tooltip_hasbeenshown";
    var NAVStatusAJAX = createXMLHttpRequest();

    function init() {
        try {
            NAVStatusAJAX.open('GET', navno.authServiceUrl + '?randomness=' + Math.random() * 10, false);
            NAVStatusAJAX.send(null);

            if (NAVStatusAJAX.readyState == 4 && NAVStatusAJAX.status == 200) {
                var json = JSON.parse(NAVStatusAJAX.responseText);

                if (json.securityLevel !== undefined) {
                    navno.securityLevel = parseInt(json.securityLevel);
                }

                if (!json.authenticated) {
                    onNotAuthenticated();
                } else if (json.securityLevel == 2) {
                    onAuthenticatedWithSecLevelTwo();
                } else if (json.securityLevel >= 3) {
                    onAuthenticatedWithSecLevelThreeOrHigher(json.name.toLowerCase());
                }
            }
        } catch (e) {
            onNotAuthenticated();
        }
    }

    function onNotAuthenticated() {
        removeClassJS("login", "hidden");
        if (document.getElementById("mainmenu")) {
            removeClassJS("login-mobil", "hidden");
        }
    }

    function onAuthenticatedWithSecLevelTwo() {
        document.getElementById("auth-btns").style.display = 'none';
        if (document.getElementById("mainmenu")) {
            document.getElementById("auth-btns-mobil").style.display = 'none';
        }
    }

    function onAuthenticatedWithSecLevelThreeOrHigher(urlEncodedName) {
        addClassJS("auth-btns", "idporten");
        removeClassJS("logout", "hidden");

        if (document.getElementById("mainmenu")) {
            removeClassJS("logout-mobil", "hidden");
        }

        var name = decodeURI(urlEncodedName);
        addName(name);
        removeClassJS("login-details", "hidden");
        showLoginTooltip()
    }

    function addClassJS(id, classname) {
        if (document.getElementById(id)) {
            document.getElementById(id).className += " " + classname;
        }
    }

    function removeClassJS(id, classname) {
        var regex = new RegExp('(^|\\s+)' + classname + '(\\s+|$)', 'g');
        if (document.getElementById(id) !== null) {
            document.getElementById(id).className = document.getElementById(id).className.replace(regex, '');
        }
    }

    function addName(name) {
        var nameElement = document.getElementById("name");
        if (nameElement) {
            nameElement.textContent = name;
            nameElement.innerText = name;
        }
    }

    function showLoginTooltip() {
        if (!loginInfoHasBeenShown()) {
            setCookie(SHOULD_SHOW_LOGIN_TOOLTIP, "1", 1);
        }
    }

    function loginInfoHasBeenShown() {
        return document.cookie.indexOf(LOGIN_TOOLTIP_HAS_BEEN_SHOWN) !== -1;
    }

    function setCookie(key, value, expiresInMinutes) {
        var expires = new Date();
        expires.setTime(new Date().getTime() + expiresInMinutes * 60 * 1000);
        document.cookie = key + '=' + value + ';expires=' + expires.toUTCString() + ';domain=.nav.no;path=/;secure';
    }

    function deleteCookie(key) {
        setCookie(key, "", new Date(0));
    }

    function createXMLHttpRequest() {
        // See http://en.wikipedia.org/wiki/XMLHttpRequest
        // Provide the XMLHttpRequest class for IE 5.x-6.x:
        if (typeof XMLHttpRequest == "undefined") XMLHttpRequest = function () {
            try {
                return new ActiveXObject("Msxml2.XMLHTTP.6.0")
            } catch (e) {
            }
            try {
                return new ActiveXObject("Msxml2.XMLHTTP.3.0")
            } catch (e) {
            }
            try {
                return new ActiveXObject("Msxml2.XMLHTTP")
            } catch (e) {
            }
            try {
                return new ActiveXObject("Microsoft.XMLHTTP")
            } catch (e) {
            }
            //Fail silently! alternative: //throw new Error( "This browser does not support XMLHttpRequest." )
        };
        return new XMLHttpRequest();
    }

    return {
        LOGIN_TOOLTIP_HAS_BEEN_SHOWN: LOGIN_TOOLTIP_HAS_BEEN_SHOWN,
        SHOULD_SHOW_LOGIN_TOOLTIP: SHOULD_SHOW_LOGIN_TOOLTIP,

        init: init,
        setCookie: setCookie,
        deleteCookie: deleteCookie
    };
})();