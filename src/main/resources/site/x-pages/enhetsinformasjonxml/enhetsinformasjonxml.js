var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('enhetsinformasjonxml.html');

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
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">13573,13574,13576</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttypekey=1073742864</parameter>
      <parameter name="orderBy">@timestamp ASC</parameter>
      <parameter name="index">0</parameter>
      <parameter name="count">${select(param.count, 1000)}</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
