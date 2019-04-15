var libs = {
	thymeleaf: require('/lib/thymeleaf'),
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	menu: require('/lib/menu'),
	util: require('/lib/enonic/util'),
    i18n: require('/lib/xp/i18n'),
    navUtils: require('/lib/nav-utils')
};
var view = resolve('page-nav-app.html');
var lang = require('/lib/i18nUtil');
var globals = {
    appPath: libs.util.app.getJsonName()
};

function excludeFromMainMenu(content) {
    return libs.navUtils.getParameterValue(content, 'exclude-from-mainmenu') === 'true';
}

function menuItemToJson(content, levels, l) {
    var subMenus = [];
    if (levels > 0) {
        subMenus = getSubMenus(content, levels, l);
    }

    var inPath = false;
    var isActive = false;

    var currentContent = libs.content.get({ key: '/www.nav.no/' + l});

    // Is the menuitem we are processing in the currently viewed content's path?
    if (currentContent && content._path === currentContent._path.substring(0, content._path.length)) {
        inPath = true;
    }

    // Is the currently viewed content the current menuitem we are processing?
    if (currentContent && content._path === currentContent._path) {
        isActive = true;
        inPath = false; // Reset this so an menuitem isn't both in a path and active (makes no sense)
    }

    var menuItem = content.x[globals.appPath]['menu-item'];

    return {
        displayName: content.displayName,
        menuName: menuItem.menuName && menuItem.menuName.length ? menuItem.menuName : null,
        path: content._path,
        name: content._name,
        id: content._id,
        hasChildren: subMenus.length > 0,
        inPath: inPath,
        isActive: isActive,
        newWindow: menuItem.newWindow ? menuItem.newWindow : false,
        type: content.type,
        children: subMenus,
        showLoginInfo: libs.navUtils.getParameterValue(content, 'showLoginInfo') === 'true'
    };
}

function getSubMenus(parentContent, levels, l) {
    var subMenus = [];

    if (parentContent.type === 'portal:site' && isMenuItem(parentContent)) {
        subMenus.push(menuItemToJson(parentContent, 0, l));
    }
    levels--;

    return libs.content.getChildren({
        key: parentContent._id,
        count: 200
    }).hits.reduce(function (t, el) {
        if (isMenuItem(el)) t.push(menuItemToJson(el, levels, l));
        return t;
    },subMenus);



    /*var loopLength = children.hits.length;
    for (var i = 0; i < loopLength; i++) {
        var child = children.hits[i];
        if (isMenuItem(child)) {
            subMenus.push(menuItemToJson(child, levels));
        }
    }
*/

}

function isMenuItem(content) {
    var extraData = content.x;
    if (!extraData) {
        return false;
    }
    var extraDataModule = extraData[globals.appPath];
    if (!extraDataModule || !extraDataModule['menu-item']) {
        return false;
    }
    var menuItemMetadata = extraDataModule['menu-item'] || {};

    return menuItemMetadata['menuItem'] && (!excludeFromMainMenu(content));
}

function handleGet(req, logicstuff) {
    var l = req.params.lang;
    log.info(JSON.stringify(req, null, 4));
    var site = libs.portal.getSite();
    if (!site) {
        site = libs.content.get({key: '/www.nav.no'})
    }
    var content = libs.content.get({key: '/www.nav.no/' + l});

    var langBundles = lang.parseBundle(l || 'no').pagenav;


    var menuItems = getSubMenus(site, 4, l);

    menuItems = menuItems[menuItems.findIndex(function (value) {
        var lang = l || 'no';
        return value.name === lang;
    })];






    var bodyClassExtras = "contentpage";


    var frontPageUrl = libs.portal.pageUrl({id: site._id})
    var languageSelectors = [
        {
            href: frontPageUrl + '/no',
            title: 'Norsk (Globalt språkvalg)',
            text: 'Norsk',
            active: !content || content.language === 'no' ? 'active' : ''
        },
        {
            href: frontPageUrl + '/en',
            title: 'English (Globalt språkvalg)',
            text: 'English',
            active: content === 'en' ? 'active' : ''
        },
        {
            href: frontPageUrl + '/se',
            title: 'Sámegiella (Globalt Språkvalg)',
            text: 'Sámegiella',
            active: content === 'se' ? 'active': ''
        }
    ]
    var model = {
        languageSelectors: languageSelectors,
		isEditMode: (req.mode === 'edit'),
        context: req,
        site: site,
        content: content,
        frontPageUrl: frontPageUrl,
        menu: menuItems,
        bodyClassExtras: bodyClassExtras,
        lang: langBundles
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model)
    };
}

exports.get = handleGet;




if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
        value: function(predicate) {
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }
            var o = Object(this);
            var len = o.length >>> 0;
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var thisArg = arguments[1];
            var k = 0;
            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return k;
                }
                k++;
            }
            return -1;
        },
        configurable: true,
        writable: true
    });
}


exports.getFromService = function (req) {

    var html = exports.get(req);
   return  html;
}