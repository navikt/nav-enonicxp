var thymeleafLib = require('/lib/xp/thymeleaf');
var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');

var view = resolve('shortcut-box-link-list-tripple.html');

function handleGet(req) {

    var content = portalLib.getContent();
    var sectionIds = [].concat(content.data.sectionContents || []);

    var niceToKnowContents = getNiceToKnowContents(content, sectionIds);
    var newsContents = getNewsContents(content);
    var shortcutContents = getShortcutContents(content);
    log.info('nicetoknow: ' + JSON.stringify(niceToKnowContents, null, 2));
    var params = {
        nicetoknow: niceToKnowContents,
        news: newsContents,
        shortcuts: shortcutContents
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;

function getNiceToKnowContents(content) {
    var nicetoknow = utils.getContentParam(content, 'nicetoknow');
    if (!nicetoknow) {
        return [];
    }
    var section = utils.getContentByMenuKey(nicetoknow);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return [];
    }

    var queryResult = contentLib.query({
        start: 0,
        count: 5,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });
    return utils.sortContents(queryResult.hits, sectionIds);
}

function getNewsContents(content) {
    var news = utils.getContentParam(content, 'news');
    if (!news) {
        return [];
    }
    var section = utils.getContentByMenuKey(news);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return [];
    }

    var queryResult = contentLib.query({
        start: 0,
        count: 3,
        filters: {
            ids: {
                values: sectionIds
            }
        },
        contentTypes: [app.name + ':nav.snarvei', app.name + ':nav.nyhet', app.name + ':nav.pressemelding',
            app.name + ':Artikkel_Brukerportal']
    });
    return utils.sortContents(queryResult.hits, sectionIds);
}

function getShortcutContents(content) {
    var shortcuts = utils.getContentParam(content, 'shortcuts');
    if (!shortcuts) {
        return [];
    }
    var section = utils.getContentByMenuKey(shortcuts);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return [];
    }

    var queryResult = contentLib.query({
        start: 0,
        count: 5,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });
    return utils.sortContents(queryResult.hits, sectionIds);
}

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.nicetoknow, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.news, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.shortcuts, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.nicetoknow, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">5</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.news, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'nav.snarvei' or contenttype = 'nav.nyhet' or contenttype = 'nav.pressemelding' or contenttype = 'Artikkel_Brukerportal'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">3</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.shortcuts, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">5</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
