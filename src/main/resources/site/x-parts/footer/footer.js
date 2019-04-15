var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('footer.html');

function handleGet(req) {

    var params = {
        partName: "footer"
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
      <parameter name="menuItemKey">${portal.pageKey}</parameter>
      <parameter name="withParents">true</parameter>
    </datasource>
  </datasources>

*/
