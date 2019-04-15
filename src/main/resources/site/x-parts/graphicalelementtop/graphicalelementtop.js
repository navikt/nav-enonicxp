var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('graphicalelementtop.html');

function handleGet(req) {

    var params = {
        partName: "graphicalelementtop"
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
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.menuId, -1)}</parameter>
      <parameter name="withParents">true</parameter>
    </datasource>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.menuId, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.menuId, -1)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttypekey=1073742863</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
