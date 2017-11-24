var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('skjemautlistingalleskjemaerjson.html');

function handleGet(req) {

    var params = {
        partName: "skjemautlistingalleskjemaerjson"
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
  <datasource name="getContentByCategory" result-element="skjema">
    <parameter name="categoryKeys">5289,881,7265</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query"/>
    <parameter name="orderBy">title DESC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">1000</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentByCategory" result-element="vedlegg">
    <parameter name="categoryKeys">5291</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query"/>
    <parameter name="orderBy">title DESC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">1000</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentByCategory" result-element="skjema-engelsk">
    <parameter name="categoryKeys">6046</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query"/>
    <parameter name="orderBy">title DESC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">1000</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getContentByCategory" result-element="vedlegg-engelsk">
    <parameter name="categoryKeys">6048</parameter>
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
