var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var view = resolve('article-related-content.html');

function handleGet(req) {

    var links = portal.getContent().data.links || [];
    if (typeof links === 'string') links = [links];

    links = links.map(function(id) {
        var l = content.get({key: id});
        return (l) ? { link: l._path, title: l.data.heading } : undefined;
    }).reduce(function(t, el){
        if (el) t.push(el);
        return t
    },[]);
    var hasLinks = (links.length > 0);

    var params = {
        partName: "article-related-content",
        links: links,
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
