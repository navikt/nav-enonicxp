var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('jobfairchoose.html');

function handleGet(req) {

    var params = {
        partName: "jobfairchoose"
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
    <datasource name="getCategories">
      <parameter name="categoryKey">4349</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="includeContentCount">false</parameter>
      <parameter name="includeTopCategory">false</parameter>
    </datasource>
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">4348</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query"/>
      <parameter name="orderBy">@publishfrom DESC</parameter>
      <parameter name="index">0</parameter>
      <parameter name="count">40</parameter>
      <parameter name="includeData">false</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentByCategory">
      <parameter name="categoryKeys">${select(param.maaned, -1)}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">${select(param.land, '')}</parameter>
      <parameter name="orderBy">@publishfrom DESC</parameter>
      <parameter name="index">0</parameter>
      <parameter name="count">1000</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContent">
      <parameter name="contentKeys">${select(param.key,-1)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
