var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('publisertinnhold.html');

function handleGet(req) {

    var params = {
        partName: "publisertinnhold"
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
      <parameter name="categoryKeys">6880, 6881, 6882, 6883, 6644, 7804, 805309064</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy">@publishFrom DESC</parameter>
      <parameter name="index">${select(param.index, 0)}</parameter>
      <parameter name="count">${select(param.count, 100)}</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
