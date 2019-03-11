var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('fant-du-det-du-lette-etter.html');

function handleGet(req) {

    var params = {
        partName: "fant-du-det-du-lette-etter"
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
  <datasource name="getContent">
    <parameter name="contentKeys">${select(param.key, -1)}</parameter>
    <parameter name="query"/>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentByCategory">
    <parameter name="categoryKeys">8518</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query"/>
    <parameter name="orderBy"/>
    <parameter name="index">${select(param.index, 0)}</parameter>
    <parameter name="count">10</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
