var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('samtale-bestilling.html');

function handleGet(req) {

    var params = {
        partName: "samtale-bestilling"
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
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${select(portal.pageKey,-1)}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query">contenttype = 'nav.innstilling-for-bestskjema'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">10</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${select(portal.pageKey,-1)}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query">contenttype = 'Mailmal'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
