var thymeleafLib = require('/lib/xp/thymeleaf');
var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');

var libs = {
	util: require('/lib/enonic/util'),
	moment: require('/lib/moment')
}

var view = resolve('shortcut-box-link-list-tripple.html');

/* This is the part displayed on nav.no/no/Person frontpage, the three bottom boxes listing different data like news etc. */

function handleGet(req) {

    var content = portalLib.getContent();
    var sectionIds = [].concat(content.data.sectionContents || []);

    var niceToKnowContents = getNiceToKnowContents(content);
    var newsContents = getNewsContents(content);
    var shortcutContents = getShortcutContents(content);
//    log.info('nicetoknow: ' + JSON.stringify(niceToKnowContents, null, 2));
    var params = {
        nicetoknow: niceToKnowContents,
        news: newsContents,
        shortcuts: shortcutContents,
		  self: content
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
        return null;
    }
    var section = utils.getContentByMenuKey(nicetoknow);
	//libs.util.log(section);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return null;
    }
	//libs.util.log(sectionIds);
    var queryResult = contentLib.query({
        start: 0,
        count: 5,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });
    return {
		sectionName: section.displayName,
		data: utils.sortContents(queryResult.hits, sectionIds)
	};
}

function getNewsContents(content) {
    var news = utils.getContentParam(content, 'news');
    if (!news) {
        return null;
    }
    var section = utils.getContentByMenuKey(news);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return null;
    }

    var queryResult = contentLib.query({
        start: 0,
        count: 3,
        filters: {
            ids: {
                values: sectionIds
            }
        },
        contentTypes: [
						app.name + ':nav.snarvei',
						app.name + ':nav.nyhet',
						app.name + ':nav.pressemelding',
            		app.name + ':Artikkel_Brukerportal'
					  ]
    });

	// Each news item needs to format the publish.from date in two separate ways, based on language.
	// In XSLT the time.xsl STK function is used, it will only show Norwegian format for Norwegians, and fallback to the English format for all other locales. That is pretty simple logic.
	if (queryResult.total > 0) {
		for (var i = 0; i < queryResult.hits.length; i++) {
			queryResult.hits[i].computedDates = {
				full: libs.moment(queryResult.hits[i].publish.from).format("YYYY-MM-DD hh:mm"),
				no: libs.moment(queryResult.hits[i].publish.from).format("DD.MM.YYYY"),
				en: libs.moment(queryResult.hits[i].publish.from).format("DD/MM/YYYY")
			};
		}
	}

    return {
		sectionName: section.displayName,
		data: utils.sortContents(queryResult.hits, sectionIds)
	};
}

function getShortcutContents(content) {
    var shortcuts = utils.getContentParam(content, 'shortcuts');
    if (!shortcuts) {
        return null;
    }
    var section = utils.getContentByMenuKey(shortcuts);
    var sectionIds = section && section.data.sectionContents;
    if (!sectionIds) {
        return null;
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
    return {
		sectionName: section.displayName,
		data: utils.sortContents(queryResult.hits, sectionIds)
	};
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
