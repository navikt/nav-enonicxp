var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var trans = require('/lib/contentTranslator');
var utils = require('/lib/nav-utils');
var view = resolve('main-article-related-content.html');

function handleGet(req) {

    var content = portal.getContent();
    var menuListItems = content.data.menuListItems || [];
    var keys =
        (menuListItems._selected
            ? (Array.isArray(menuListItems._selected) ? menuListItems._selected : [menuListItems._selected])
            : []
        );
    var links = keys.map( function(el) {
        return ({ name: el, links: forceArr(menuListItems[el].link).map(function (link){
                var element = contentLib.get({key: link});
                return(
                    { title: element.data.heading || element.displayName, link: portal.pageUrl({id: link}) }
                );
            })
        });
    });

    trans.logBeautify(links);

    var hasMenuLists = (links.length > 0);
    log.info(hasMenuLists);
    var params = {
        relatedContentList: links,
        hasMenuList: hasMenuLists
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}



exports.get = handleGet;
function forceArr(element) {
    return Array.isArray(element) ? element : [element]
}
/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource condition="${isnotempty(param.submenu)}" name="getContent">
      <parameter name="contentKeys">${replace(param.kap, '[a-zA-Z]+', '0')}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource condition="${isnotempty(param.kap)}" name="getRelatedContent" result-element="relatedforms">
      <parameter name="contentKeys">${replace(param.kap, '[a-zA-Z]+', '0')}</parameter>
      <parameter name="relation">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">100</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContent" result-element="rapporthandbok">
      <parameter name="contentKeys">${select(param.key, -1)}</parameter>
      <parameter name="query">contenttype = 'Rapport_handbok'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
