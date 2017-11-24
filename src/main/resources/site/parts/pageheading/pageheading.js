var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('pageheading.html');

function handleGet(req) {

    var params = {
        partName: "pageheading"
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
      <parameter name="menuItemKey">${param.id}</parameter>
      <parameter name="withParents">true</parameter>
    </datasource>
  </datasources>

*/
