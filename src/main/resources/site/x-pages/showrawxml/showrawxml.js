var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('showrawxml.html');

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
    <datasource name="getMenuBranch">
      <parameter name="menuItemKey">13285</parameter>
      <parameter name="includeTopLevel">false</parameter>
      <parameter name="startLevel">1</parameter>
      <parameter name="levels">3</parameter>
    </datasource>
  </datasources>

 */
