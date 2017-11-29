var thymeleafLib = require('/lib/xp/thymeleaf');
var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');

var view = resolve('shortcut-box-link-hero-tripple.html');

function handleGet(req) {

    var content = portalLib.getContent();
    var sectionIds = [].concat(content.data.sectionContents || []);
    var queryResult = contentLib.query({
        start: 0,
        count: 100,
        filters: {
            ids: {
                values: sectionIds
            }
        },
        contentTypes: [app.name + ':nav.lenke-med-ikon']
    });

    var contents = utils.sortContents(queryResult.hits, sectionIds);

    var params = {
        contents: contents
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(portal.pageKey,-1)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'nav.lenke-med-ikon'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">10</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
