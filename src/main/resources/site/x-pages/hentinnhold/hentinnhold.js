var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('hentinnhold.html');

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
    <datasource name="getContentBySection">
      <parameter name="menuItemKeys">${select(portal.pageKey, -1)}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'modernisering_artikkel' ${isnotblank(param.key) ? concat(' AND ', buildFreetextQuery('title', param.key, 'AND')) : '' } ${isnotblank(param.tags) ? concat(' AND ', buildFreetextQuery('data.tags', replace(param.tags, ',', ' '), 'OR')) : ''}</parameter>
      <parameter name="orderBy">title ASC</parameter>
      <parameter name="index">${select(param.index, 0)}</parameter>
      <parameter name="count">${select(param.count, 100)}</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

 */
