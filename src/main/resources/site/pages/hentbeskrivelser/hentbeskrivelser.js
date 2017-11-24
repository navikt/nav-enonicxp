var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('hentbeskrivelser.html');

function handleGet(req) {
    var site = portalLib.getSite();
    var reqContent = portalLib.getContent();

    var params = {
        context: req,
        site: site,
        reqContent: reqContent
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;


/*
 * The following DataSources were used in the original CMS page template:

 <datasources>
    <datasource name="getContentByCategory" result-element="skjema">
      <parameter name="categoryKeys">5289,881</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">${isnotblank(param.key) ? buildFreetextQuery('title', param.key, 'AND') : '' }</parameter>
      <parameter name="orderBy">title ASC</parameter>
      <parameter name="index">${select(param.index, 0)}</parameter>
      <parameter name="count">${select(param.count, 1000)}</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory" result-element="vedlegg">
      <parameter name="categoryKeys">5291</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">${isnotblank(param.key) ? buildFreetextQuery('title', param.key, 'AND') : '' }</parameter>
      <parameter name="orderBy">title ASC</parameter>
      <parameter name="index">${select(param.index, 0)}</parameter>
      <parameter name="count">${select(param.count, 1000)}</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
