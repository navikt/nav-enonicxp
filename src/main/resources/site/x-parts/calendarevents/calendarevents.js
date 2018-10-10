var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('calendarevents.html');

function handleGet(req) {

    var params = {
        partName: "calendarevents"
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
      <parameter name="categoryKeys">${select(param.kalender,-1)}</parameter>
      <parameter name="levels">2</parameter>
      <parameter name="query">contenttype = 'Kalenderhendelse'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">${select(param.index, 0)}</parameter>
      <parameter name="count">100</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
