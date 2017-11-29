var portalLib = require('/lib/xp/portal');
var thymeleafLib = require('/lib/xp/thymeleaf');
var utils = require('/lib/nav-utils');

var view = resolve('article.html');

function handleGet(req) {
    var content = portalLib.getContent();

    var contentKey = utils.getContentParam(content, 'key');
    var article;
    if (contentKey) {
        article = utils.getContentByCmsKey(contentKey);
        article.publishFromText = utils.dateTimePublished(article, 'no');
    }

    var params = {
        appNamePre: app.name + ':',
        content: article,
        driftsMelding: article.type === (app.name + ':Driftsmelding_nav')
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
  <datasource name="getContent">
    <parameter name="contentKeys">${select(param.key, -1)}</parameter>
    <parameter name="query"/>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">0</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
