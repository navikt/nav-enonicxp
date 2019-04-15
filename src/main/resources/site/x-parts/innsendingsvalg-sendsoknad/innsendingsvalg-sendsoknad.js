var libs = {
    portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/thymeleaf'),
    i18n: require('/lib/xp/i18n'),
    skjema: require('/lib/skjema'),
	util: require('/lib/enonic/util')
};

var appPath = libs.util.app.getJsonName();
var view = resolve('innsendingsvalg-sendsoknad.html');



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

    var forms = [];
    if (content.data.sectionContents) {
        libs.util.data.forceArray(content.data.sectionContents).forEach(function (sectionContentId) {
            var sectionContent = libs.content.get({ key: sectionContentId });

            if (sectionContent && sectionContent.type === app.name + ':Skjema_for_veileder') {
                forms.push(sectionContent);
            }
        });
    }

    var schematext = [];
    if (content.data.sectionContents) {
        libs.util.data.forceArray(content.data.sectionContents).forEach(function (sectionContentId) {
            var sectionContent = libs.content.get({ key: sectionContentId });

            if (sectionContent && sectionContent.type === app.name + ':Skjemaveiledertekster' && sectionContent.data.veiledertype == veilederType) {
                schematext.push(sectionContent);
            }
        });
    }

    var model = {
        isEditMode: (request.mode === 'edit'),
        form: forms.length ? forms[0] : null,
        qpSkjematitle: qpSkjematitle,
        schematext: schematext.length ? schematext[0].data : null,
        submissionMenuitems: null
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
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
    <parameter name="levels">2</parameter>
    <parameter name="query">contenttype = 'skjema_for_veileder'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">1</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">1</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getSubMenu" result-element="submission">
    <parameter name="menuItemKey" type="int">${portal.pageKey}</parameter>
    <parameter name="tagItem" type="boolean">0</parameter>
    <parameter name="levels" type="boolean">0</parameter>
  </datasource>
  <!--datasource name="getMenuBranch" result-element="submission">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">true</parameter>
	<paramater name="startLevel" type="int">5</paramater>
    <parameter name="levels" type="int">2</parameter>
  </datasource-->
  <datasource name="getMenuItem" result-element="full-path">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="withParents">true</parameter>
  </datasource>
</datasources>

*/
