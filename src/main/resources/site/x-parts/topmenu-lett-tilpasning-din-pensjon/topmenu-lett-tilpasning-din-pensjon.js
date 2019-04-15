var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('topmenu-lett-tilpasning-din-pensjon.html');

function handleGet(req) {

    var params = {
        partName: "topmenu-lett-tilpasning-din-pensjon"
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
    <datasource name="getMenu">
      <parameter name="siteKey">20</parameter>
      <parameter name="tagItem">${portal.pageKey}</parameter>
      <parameter name="levels">2</parameter>
    </datasource>
  </datasources>

*/
