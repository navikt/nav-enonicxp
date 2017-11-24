var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('linklist-contentbyletter.html');

function handleGet(req) {

    var params = {
        partName: "linklist-contentbyletter"
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
    <parameter name="includeTopLevel">false</parameter>
    <paramater name="startLevel">1</paramater>
    <parameter name="levels">5</parameter>
  </datasource>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${param.id}</parameter>
    <parameter name="levels">2</parameter>
    <parameter name="query">title STARTS WITH '${param.letter}'</parameter>
    <parameter name="orderBy">title ASC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">${select(param.count, 100)}</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">0</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
