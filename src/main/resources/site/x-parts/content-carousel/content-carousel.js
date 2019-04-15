var thymeleafLib = require('/lib/thymeleaf');
var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var utils = require('/lib/nav-utils');
var coTrans = require('/lib/contentTranslator');
var view = resolve('content-carousel.html');

/* This is the part displayed on nav.no/no/Person frontpage, the three top boxes underneath the illustration. */
/* It fetches its contents (up to 10) from the page/section it is added to and the ContentSelector field there. */

function handleGet(req) {
    var site = portalLib.getSite();
    var content = portalLib.getContent();
    var sectionIds = [].concat(content.data.sectionContents || []);
    var queryResult = contentLib.query({
        start: 0,
        count: 10,
        filters: {
            ids: {
                values: sectionIds
            }
        }
    });



    var contents = utils.sortContents(queryResult.hits, sectionIds).map(function(content) {
        var icon = (content.data.icon) ? content.data.icon : 'document';
        icon = (icon === 'padlock') ? 'login' : icon;
        icon = 'icon-' + icon;
        content.data.icon = icon;
        content.data.heading = content.data.heading || content.data.title
        content.data.description = content.data.description || content.data['list_description'] || content.data.ingress || content.data.preface;
        return content
    });

    if (contents.length === 0) {
        contents = queryResult.hits.map(function(cont) {
            cont.data.url = portalLib.pageUrl({id: cont.data.link});
            cont.data.icon = "icon-" + cont.data.icon;
            cont.data.heading = cont.data.heading || cont.data.title;
            cont.data.description = cont.data.description || cont.data['list_description'] || cont.data.ingress || content.data.preface;
            return cont;
        });
    }



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


/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${param.id}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'Artikkel_Brukerportal' or contenttype = 'Kort_om' or contenttype = 'nav.rapporthandbok' or contenttype = 'Ekstern_lenke' or contenttype = 'nav.sidebeskrivelse'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">20</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
