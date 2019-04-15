var libs = {
    content: require('/lib/xp/content'),
    menu: require('/lib/menu'),
	portal: require('/lib/xp/portal'),
	util: require('/lib/enonic/util')
};

var appPath = libs.util.app.getJsonName();

// *********************************
// Common variables previously in the XSLT file beta.nav.no/modules/skjema-2.0/includes/skjema-variables.xsl
// *********************************




/**
 * Gets a URL parameter value if this parameter matches a predetermined regular expression (avoids invalid characters).
 * If no parameter by that name is in the URL params, also checks for params on the current content.
 * @param {Object} request Request object
 * @param {string} paramName URL paramater name to look for
 * @returns {string} Parameter value.
 */
function getValidParamFromRequestByName (request, paramName) {
    var paramVal = '';
    var content = libs.portal.getContent();

    // Value from content parameter
    if (content && content.data && content.data.parameters) {
        libs.util.data.forceArray(content.data.parameters).forEach(function(param) {
            if (param.name === paramName) {
                paramVal = param.value;
            }
        });
    }
    // Value from URL parameter (override the content parameter)
    if (request.params && request.params[paramName]) {
        paramVal = request.params[paramName];
    }

    /*
        Regex som matches mot querystring params, før de settes inn som <input> i <form> o.l for generering av PDF (forsideark).
        Tillater bokstaver, tall, mellomrom, pluss, minus, undescore, punktum, komma og semikolon
     */
    var regex = /^[a-zA-Z0-9+-_.,; æøåÆØÅ]+$/;

    if (paramVal.match(regex)) {
        return paramVal;
    } else {
        return null;
    }
};



/**
 * Gets a parameter value on a content.
 * @param {Object} content Content object (typically of type cms2xp_page or shortcut or url)
 * @param {string} paramName Paramater name to look for
 * @returns {string} Parameter value.
 */
function getParamFromContentByName (content, paramName) {
    var paramVal = null;

    if (content && content.data && content.data.parameters) {
        libs.util.data.forceArray(content.data.parameters).forEach(function(param) {
            if (param.name === paramName) {
                paramVal = param.value;
            }
        });
    }

    return paramVal;
};



/**
 * Gets a menuitem name from a content. Tries to get content param 'menu-name' and defaults to displayName.
 * @param {Object} menuitem Content object
 * @returns {string} Name of menu item content, defaults to displayName.
 */
function getMenuitemName (menuitem) {
    var name = menuitem.displayName || '';
    if (menuitem.data && menuitem.data.parameters) {
        libs.util.data.forceArray(menuitem.data.parameters).forEach(function (param) {
            if (param.name === 'menu-name' && param.value) {
                name = param.value;
            }
        });
    }
    return name;
};



function getVeilederType () {
    var veilederType = 'privatperson';
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();

    // Traverse path upwards to find the a menuitem with param 'veiledertype' present and return its value
    // This logic has been shamelessly copied and modified from getBreadcrumbMenu() in /lib/menu
    if (content._path != site._path) {
		var fullPath = content._path;
		var arrVars = fullPath.split("/");
		var arrLength = arrVars.length;
		for (var i = 1; i < arrLength-1; i++) { // Skip first item - the site - since it is handled separately.
			var lastVar = arrVars.pop();
			if (lastVar != '') {
				var curItem = libs.content.get({ key: arrVars.join("/") + "/" + lastVar }); // Make sure item exists
				if (curItem && curItem.data.parameters) {
                    libs.util.data.forceArray(curItem.data.parameters).forEach(function (param) {
                        if (param.name === 'veiledertype' && param.value) {
                            // Return veilederType from menuitem param (disregard any other occurences in the path)
                            return param.value;
                        }
                    });
				}
			}
		}
	}

    // Return default
    return veilederType;
};



exports.getVeilederType = getVeilederType;
exports.getValidParamFromRequestByName = getValidParamFromRequestByName;
exports.getParamFromContentByName = getParamFromContentByName;
exports.getMenuitemName = getMenuitemName;
