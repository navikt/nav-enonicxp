var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('frameworkdynamic.html');

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
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${portal.pageKey}</parameter>
      <parameter name="withParents">true</parameter>
    </datasource>
    <datasource name="getMenu">
      <parameter name="siteKey">20</parameter>
      <parameter name="tagItem">${portal.pageKey}</parameter>
      <parameter name="levels">1</parameter>
    </datasource>
    <datasource name="getContent">
      <parameter name="contentKeys">${select(param.key,0)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection" result-element="shortcuts">
      <parameter name="menuItemKeys">1073743190</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttypekey = '1013'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">25</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory" result-element="innloggingslinje">
      <parameter name="categoryKeys">5841</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">10</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
