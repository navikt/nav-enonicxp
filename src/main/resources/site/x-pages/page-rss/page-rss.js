var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('page-rss.html');

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
      <parameter name="menuItemKeys">13574</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'nav.nyhet' OR contenttype = 'nav.pressemelding'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">20</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
