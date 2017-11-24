var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('linklist-heroblocks.html');

function handleGet(req) {

    var params = {
        partName: "linklist-heroblocks"
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
  <datasource name="getMenuBranch" result-element="subcat">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">true</parameter>
    <paramater name="startLevel">4</paramater>
    <parameter name="levels">2</parameter>
  </datasource>
</datasources>

*/
