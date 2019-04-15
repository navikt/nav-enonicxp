var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('dinpensjontextpage.html');

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
    <datasource name="getContent" result-element="single">
      <parameter name="contentKeys">${select(param.key,-1)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource condition="${isempty(param.key)}" name="getContentBySection" result-element="list">
      <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">100</parameter>
      <parameter name="includeData">false</parameter>
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
