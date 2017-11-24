var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('innholdreferanserframeny.html');

function handleGet(req) {

    var params = {
        partName: "innholdreferanserframeny"
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
      <parameter name="tagItem">13574</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
    <datasource name="getMenu">
      <parameter name="siteKey">20</parameter>
      <parameter name="tagItem">13576</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
    <datasource name="getMenu">
      <parameter name="siteKey">20</parameter>
      <parameter name="tagItem">13573</parameter>
      <parameter name="levels">0</parameter>
    </datasource>
  </datasources>

*/
