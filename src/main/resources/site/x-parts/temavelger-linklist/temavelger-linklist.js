var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('temavelger-linklist.html');

function handleGet(req) {

    var params = {
        partName: "temavelger-linklist"
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
      <parameter name="menuItemKeys">${param.id}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">-${select(param.offset, 0)}</parameter>
      <parameter name="count">10</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
