var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('navenhet-autocomplete.html');

function handleGet(req) {

    var params = {
        partName: "navenhet-autocomplete"
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
    <parameter name="categoryKeys">805309064</parameter>
    <parameter name="levels">2</parameter>
    <parameter name="query">${ stringlength(param.term) != 0 ? concat (buildFreetextQuery( "data/*", trim(param.term), "AND"), 'AND data/officeNumber != ""') : 'data/officeNumber != ""'}</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1000</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
