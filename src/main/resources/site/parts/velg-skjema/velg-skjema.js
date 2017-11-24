var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('velg-skjema.html');

function handleGet(req) {

    var params = {
        partName: "velg-skjema"
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
    <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query">contenttype = 'Innsendingsveileder_velg_skjema'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">100</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">3</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getMenuItem" result-element="full-path">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="withParents">true</parameter>
  </datasource>
</datasources>

*/
