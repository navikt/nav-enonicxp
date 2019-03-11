var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('sokestatistikk.html');

function handleGet(req) {

    var params = {
        partName: "sokestatistikk"
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
      <parameter name="url">${select(param.url, 'http://sok.nav.no/nav/accesslogscore/select/?q=${isblank(param.query) ? "*%3A*" : concat("query%3A", concat(select(param.query, ''), isblank(select(param.fuzzy, '')) ? '*': '~'))}&amp;fq=${isblank(param.aar) ? "*%3A*" : concat("aar%3A",select(param.aar, ''))}&amp;fq=${isblank(param.mnd) ? "doctype:AAR" : concat("doctype:MND&amp;fq=mnd%3A",select(param.mnd, ''))}&amp;start=0&amp;rows=200&amp;indent=on&amp;facet=true&amp;facet.field=aar&amp;facet.field=mnd&amp;facet.sort=index&amp;sort=count+desc')}</parameter>
    </datasource>
  </datasources>

*/
