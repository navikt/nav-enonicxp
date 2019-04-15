var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('skjemaveileder-tekstproperties.html');

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
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">${select(param.categoryKey,5823)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1000</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">${select(param.categoryKey,5774)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1000</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
