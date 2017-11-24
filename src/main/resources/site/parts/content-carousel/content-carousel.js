var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('content-carousel.html');

function handleGet(req) {

    var params = {
        partName: "content-carousel"
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
      <parameter name="query">contenttype = 'Artikkel_Brukerportal' or contenttype = 'Kort_om' or contenttype = 'nav.rapporthandbok' or contenttype = 'Ekstern_lenke' or contenttype = 'nav.sidebeskrivelse'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.offset, 0)}</parameter>
      <parameter name="count">20</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
