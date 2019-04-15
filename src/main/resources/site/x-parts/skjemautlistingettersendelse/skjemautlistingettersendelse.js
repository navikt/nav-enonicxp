var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('skjemautlistingettersendelse.html');

function handleGet(req) {

    var params = {
        partName: "skjemautlistingettersendelse"
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
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">5289, 5433</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query"/>
      <parameter name="orderBy">title DESC</parameter>
      <parameter name="index">0</parameter>
      <parameter name="count">1000</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
