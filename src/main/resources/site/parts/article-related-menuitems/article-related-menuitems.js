var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('article-related-menuitems.html');

function handleGet(req) {

    var params = {
        partName: "article-related-menuitems"
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
    <datasource name="getMenuBranch">
      <parameter name="menuItemKey">${portal.pageKey}</parameter>
      <parameter name="includeTopLevel">true</parameter>
      <parameter name="startLevel">3</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
  </datasources>

*/
