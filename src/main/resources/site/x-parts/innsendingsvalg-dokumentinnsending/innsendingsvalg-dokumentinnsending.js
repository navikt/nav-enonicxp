var libs = {
    portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/thymeleaf'),
    i18n: require('/lib/xp/i18n'),
    skjema: require('/lib/skjema'),
    navUtils: require('/lib/nav-utils'),
	util: require('/lib/enonic/util')
};

var appPath = libs.util.app.getJsonName();
var view = resolve('innsendingsvalg-dokumentinnsending.html');



/**
 * Creates an HTML response to the GET request on page load
 * @param  {Object} request GET request
 * @return {Object}
 */
function handleGet(request) {
    var content = libs.portal.getContent();
    var site = libs.portal.getSite();
    var component = libs.portal.getComponent();
    var config = component.config;

    var veilederType = libs.skjema.getVeilederType();
    var qpSkjematitle = libs.skjema.getValidParamFromRequestByName(request, 'skjematitle');
    var formKey = libs.skjema.getValidParamFromRequestByName(request, 'key');
    var form = libs.navUtils.getContentByCmsKey(formKey);
    
    var schematext = [];
    if (content.data.sectionContents) {
        libs.util.data.forceArray(content.data.sectionContents).forEach(function (sectionContentId) {
            var sectionContent = libs.content.get({ key: sectionContentId });

            if (sectionContent && sectionContent.type === app.name + ':Skjemaveiledertekster' && sectionContent.data.veiledertype == veilederType) {
                schematext.push(sectionContent);
            }
        });
    }

    /*
    var schematextQuery = libs.content.query({
        contentTypes: [ app.name + ':Skjemaveiledertekster' ],
        count: 10,
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.veiledertype',
                        values: [ veilederType ]
                    }
                }
            }
        }
    });
    */

    var model = {
        isEditMode: (request.mode === 'edit'),
        form: form,
        qpSkjematitle: qpSkjematitle,
        schematext: schematext.length ? schematext[0].data : null,
        submissionMenuitems: null
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model)
    };
}

exports.all = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
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
