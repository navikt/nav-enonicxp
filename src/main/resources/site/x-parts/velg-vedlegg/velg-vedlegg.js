var libs = {
    portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/thymeleaf'),
    i18n: require('/lib/xp/i18n'),
    navUtils: require('/lib/nav-utils'),
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
    var site = libs.portal.getSite();
    var actionUrl = libs.portal.pageUrl({
        path: site._path + '/no/Person/Skjemaer-for-privatpersoner/skjemaveileder/innsendingsvalg'
    });
    var contentKey = libs.skjema.getValidParamFromRequestByName(request, 'key');
    var formContent = contentKey ? libs.navUtils.getContentByCmsKey(contentKey) : null;

    var forms = [{}];
    if (formContent && formContent.data.forms && formContent.data.forms.form) {
        forms = libs.util.data.forceArray(formContent.data.forms.form);
    }

    var languages = [];
    forms.forEach(function (form) {
        if (form.language) {
            var language = libs.content.get({ key: form.language });
            if (language) {
                languages.push(language);
            }
        }
    });

    var attachmentsRequired = [];
    var attachmentsOptional = [];
    if (formContent && formContent.data.attachments) {
        libs.util.data.forceArray(formContent.data.attachments).forEach(function (a) {
            if (a.attachment_mandatory) {
                a.attachment = libs.content.get({ key: a.attachment_mandatory });
                if (a.required) {
                    attachmentsRequired.push(a);
                } else {
                    attachmentsOptional.push(a);
                }
            }
        });
    }

    var veilederType = libs.skjema.getVeilederType();

    var schematext = [];
    var pageContent = libs.portal.getContent();
    if (pageContent.data.sectionContents) {
        libs.util.data.forceArray(pageContent.data.sectionContents).forEach(function (sectionContentId) {
            var sectionContent = libs.content.get({ key: sectionContentId });

            if (sectionContent && sectionContent.type === app.name + ':Skjemaveiledertekster' && sectionContent.data.veiledertype == veilederType) {
                schematext.push(sectionContent);
            }
        });
    }

    var model = {
        isEditMode: (request.mode === 'edit'),
        actionUrl: actionUrl,
        attachmentsRequired: attachmentsRequired,
        attachmentsOptional: attachmentsOptional,
        content: formContent,
        contentKey: contentKey,
        categories: [],
        forms: forms,
        languages: languages,
        phrases: {
            showMoreText: libs.i18n.localize({
                key: 'nav.skjemaveileder.show-more-text',
                locale: pageContent.language || site.language || 'no'
            }),
            showLessText: libs.i18n.localize({
                key: 'nav.skjemaveileder.show-less-text',
                locale: pageContent.language || site.language || 'no'
            })
        },
        qpLanguagecode: libs.skjema.getValidParamFromRequestByName(request, 'languagecode'),
        qpSubmitMethod: libs.skjema.getValidParamFromRequestByName(request, 'method'),
        schematext: schematext.length ? schematext[0].data : {},
        veilederType: veilederType
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
