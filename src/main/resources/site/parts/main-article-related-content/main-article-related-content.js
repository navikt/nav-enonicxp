var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var trans = require('/lib/contentTranslator');
var utils = require('/lib/nav-utils');
var view = resolve('main-article-related-content.html');

function handleGet(req) {

    var content = portal.getContent();

    log.info("*** FØR behandling ***");
    trans.logBeautify(content);

    if (content.data.menuListItems && !Array.isArray(content.data.menuListItems)) content.data.menuListItems = [content.data.menuListItems];
    content.data.menuListItems = (content.data.menuListItems) ? content.data.menuListItems.map(function (item) {
        if (!item.link) item.link = [];
        if (typeof item.link === 'string') item.link = [item.link];
        return {
            menuListName: item.menuListName,
            text: item.text,
            link: item.link.map(function(l) {

            var r;
            try{
                r= contentLib.get({key: l});
            } catch (e) {
                log.info("Failed in marc " + l);
            }

            return (r) ? {title: r.data.heading, link: portal.pageUrl({id: r._id})} : undefined
            }).reduce(function(t,e) {
                if (e) t.push(e);
                return t;
            },[] )}
    }).reduce(function (t, el) {
        if (el.link && el.link.length > 0) t.push(el);
        return t;
    }, []) : [];

    log.info("*** ETTER behandling ***");
    trans.logBeautify(content);
    log.info("************************");

    var hasLinks = (content.data.menuListItems.length > 0);
    var params = {
        publishedFromText: utils.dateTimePublished(content, 'no'),
        content: content,
        hasLinks: hasLinks
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
