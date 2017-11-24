var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('navnoskjemaer.html');

function handleGet(req) {

    var params = {
        partName: "navnoskjemaer"
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
    <parameter name="categoryKeys">5289,8473,881</parameter>
    <parameter name="levels">0</parameter>
    <parameter name="query"/>
    <parameter name="orderBy">title ASC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">5000</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
