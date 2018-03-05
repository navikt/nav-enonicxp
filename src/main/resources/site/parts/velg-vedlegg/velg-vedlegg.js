var libs = {
    portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
    i18n: require('/lib/xp/i18n'),
    skjema: require('/lib/skjema'),
	util: require('/lib/enonic/util')
};

var appPath = libs.util.app.getJsonName();
var view = resolve('velg-vedlegg.html');



/**
 * Creates an HTML response to the GET request on page load
 * @param  {Object} request GET request
 * @return {Object}
 */
function handleGet(request) {

    var model = {
        isEditMode: (request.mode === 'edit')
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model)
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource name="getContent">
      <parameter name="contentKeys">${select(param.key, 0)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">3</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection" result-element="schematext">
      <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'Skjemaveiledertekster'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">10</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
