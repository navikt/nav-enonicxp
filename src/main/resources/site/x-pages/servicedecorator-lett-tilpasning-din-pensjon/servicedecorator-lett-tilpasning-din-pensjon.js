var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('servicedecorator-lett-tilpasning-din-pensjon.html');

function handleGet(req) {
    var site = portalLib.getSite();
    var reqContent = portalLib.getContent();

    var params = {
        context: req,
        site: site,
        reqContent: reqContent
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;


/*
 * The following DataSources were used in the original CMS page template:

 <datasources>
    <datasource name="getMenu">
      <parameter name="siteKey">20</parameter>
      <parameter name="tagItem">-1</parameter>
      <parameter name="levels">2</parameter>
    </datasource>
    <datasource name="getSubMenu">
      <parameter name="menuItemKey">${select(param.toppmenypunkt,0)}</parameter>
      <parameter name="tagItem">${select(param.id, select(param.applikasjonsId,0))}</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
    <datasource name="getContent">
      <parameter name="contentKeys">${select(param.key, '0')}</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">10</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory" result-element="innloggingslinje">
      <parameter name="categoryKeys">5841</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">5</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
