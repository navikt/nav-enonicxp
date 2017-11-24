var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('shortcut-box-link-list-tripple.html');

function handleGet(req) {

    var params = {
        partName: "shortcut-box-link-list-tripple"
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
      <parameter name="menuItemKey">${select(param.nicetoknow, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.news, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getMenuItem">
      <parameter name="menuItemKey">${select(param.shortcuts, -1)}</parameter>
      <parameter name="withParents">false</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.nicetoknow, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">5</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.news, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'nav.snarvei' or contenttype = 'nav.nyhet' or contenttype = 'nav.pressemelding' or contenttype = 'Artikkel_Brukerportal'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">3</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(param.shortcuts, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">5</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
