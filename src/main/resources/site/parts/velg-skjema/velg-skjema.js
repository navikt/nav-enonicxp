var libs = {
    portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
    i18n: require('/lib/xp/i18n'),
    skjema: require('/lib/skjema'),
	util: require('/lib/enonic/util')
};

var appPath = libs.util.app.getJsonName();
var view = resolve('velg-skjema.html');



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

    // TODO: retreive these values from component config
    var innsendingsvalg = site._path + '/no/person/skjemaer-for-privatpersoner/skjemaer/arbeid-helse-og-sykdom/arbeidsavklaringspenger/arbeidsavklaringspenger/innsendingsvalg-aap';
    var vedleggPrivat = site._path + '/no/person/skjemaer-for-privatpersoner/skjemaveileder/vedlegg';
    var vedleggBedrift = site._path + '/no/bedrift/skjemaer-for-arbeidsgivere/skjemaveileder/vedlegg-bedrift';

    var attachmentViewPagePath = vedleggPrivat;
    if (veilederType.match('arbeidsgiver')) {
        attachmentViewPagePath = vedleggBedrift;
    }

    var sectionContents = []; // content type Innsendingsveileder_velg_skjema
    if (content.data.sectionContents) {
        sectionContents = libs.util.data.forceArray(content.data.sectionContents).map(function (sectionContentId) {
            var sectionContent = libs.content.get({ key: sectionContentId });

            // Truncate description to 300 chars (but first remove non-breaking spaces and HTML tags)
            var desc = libs.portal.processHtml({ value: sectionContent.data.description });
            var descNoNbsp = desc.replace(/&nbsp;/gi, '');
            var descNoTags = descNoNbsp.replace(/<[^>]*>/g, ' ').trim();
            var descLength = descNoTags.length;
            var descTruncated = descNoTags.substr(0, 300) + '…';

            // Info URL and text
            var firstInfoContentId = null;
            var infoContent = null;
            if (sectionContent.data.info) {
                firstInfoContentId = libs.util.data.forceArray(sectionContent.data.info)[0];
                infoContent = libs.content.get({ key: firstInfoContentId });
            }
            var infoText = infoContent ? infoContent.displayName : null;
            if (sectionContent.data['info-text']) {
                infoText = sectionContent.data['info-text'];
            }
            var infoUrl = infoContent ? libs.portal.pageUrl({ id: firstInfoContentId }) : null;

            // URL
            var url = '';
            var firstFormId = libs.util.data.forceArray(sectionContent.data.form)[0];
            var form = firstFormId ? libs.content.get({ key: firstFormId }) : null;
            if (form) {
                var formContentKey = form._id;
                // Prefer using CMS content key for URL backwards compatibility (browser bookmarks and history)
                // If backwards compatibility is no longer an issue, just use XP _id instead
                if (form.x && form.x[appPath] && form.x[appPath].cmsContent && form.x[appPath].cmsContent.contentKey) {
                    formContentKey = form.x[appPath].cmsContent.contentKey;
                }
                var qpSubmitMethod = libs.skjema.getValidParamFromRequestByName(request, 'method');
                if (qpSubmitMethod !== 'mail' && form.data.modernisert == 'true') { // double equals for sloppy boolean assertion
                    var soknadsdialog = form.data.soknadsdialog ? libs.content.get({ key: form.data.soknadsdialog }) : null;
                    if (soknadsdialog && soknadsdialog.data.url && !veilederType.match('ettersendelse')) {
                        url = soknadsdialog.data.url;
                    } else {
                        url = libs.portal.pageUrl({
                            path: innsendingsvalg,
                            params: {
                                key: formContentKey,
                                veiledertype: veilederType
                            }
                        });
                    }
                } else {
                    url = libs.portal.pageUrl({
                        path: attachmentViewPagePath,
                        params: {
                            key: formContentKey,
                            veiledertype: veilederType
                        }
                    });
                }

                if (qpSubmitMethod === 'mail') {
                    url += '&method=mail';
                }
            }

            // sectionContent data
            return {
                title: sectionContent.displayName,
                description: desc,
                descriptionTruncated: (descLength > 300) ? descTruncated : null,
                infoUrl: infoUrl,
                infoText: infoText,
                url: url
            }
        });
    }

    var model = {
        isEditMode: (request.mode === 'edit'),
        title: libs.skjema.getMenuitemName(content),
        contents: sectionContents,
        phrases: {
            showMoreText: libs.i18n.localize({
                key: 'nav.skjemaveileder.show-more-text',
                locale: content.language || site.language || 'no'
            }),
            showLessText: libs.i18n.localize({
                key: 'nav.skjemaveileder.show-less-text',
                locale: content.language || site.language || 'no'
            }),
            choose: libs.i18n.localize({
                key: 'nav.skjemaveileder.choose',
                locale: content.language || site.language || 'no'
            })
        }
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
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${select(param.id,0)}</parameter>
    <parameter name="levels">1</parameter>
    <parameter name="query">contenttype = 'Innsendingsveileder_velg_skjema'</parameter>
    <parameter name="orderBy"/>
    <parameter name="index">0</parameter>
    <parameter name="count">100</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">3</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
  <datasource name="getMenuItem" result-element="full-path">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="withParents">true</parameter>
  </datasource>
</datasources>

*/
