var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('skjemaveileder-postnr-enhet.html');

function handleGet(req) {

    var params = {
        partName: "skjemaveileder-postnr-enhet"
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
  <datasource name="getUrlAsXml">
    <parameter name="url">https://www-q1.nav.no/_public/beta.nav.no/postnummerfil/postnummer.xml</parameter>
  </datasource>
</datasources>

*/
