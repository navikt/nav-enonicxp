const thymeleaf = require('/lib/thymeleaf');
const { getTimeline, findComponents } = require('/lib/versionHistory');
const { getRenderedComponent } = require('/lib/versionHistory/components');

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
};

const view = resolve('versionHistorySimpleView.html');

const getContentInfo = (version) => {
    return {
        description: version.description,
        versionId: version.versionId,
        displayName: version?.content?.displayName,
        from: libs.utils.formatDateTime(version.from),
        publishedFrom: libs.utils.formatDateTime(version.content.publish.from),
        to: libs.utils.formatDateTime(version.to),
        type: version.content.type,
        renderType:
            dynamicRenderedContentTypes.indexOf(version.content.type) !== -1 ? 'dynamic' : 'custom',
    };
};

const renderDynamicPage = (version) => {
    const { components } = version.content;
    const parts = findComponents(components, [version.fromDate, version.toDate]);

    const renderedParts = parts
        .map((component) => {
            if (component?.part) {
                if (component.type === 'fragment') {
                    return {
                        ...getRenderedComponent(component.part),
                        type: 'fragment',
                        to: libs.utils.formatDateTime(component.to),
                        from: libs.utils.formatDateTime(component.from),
                    };
                }
                return getRenderedComponent(component.part);
            }
            // if the component is fetched from with content-lib the structure is not the same as
            // above
            if (component?.type === 'part' && component?.descriptor && component?.config) {
                return getRenderedComponent(component);
            }
            if (component?.layout) {
                return getRenderedComponent(component.layout);
            }
            log.info(`unknown component: ${JSON.stringify(component)}`);
            return false;
        })
        .filter((item) => !!item);
    return { ...getContentInfo(version), parts: renderedParts };
};

const renderMainArticle = (version) => {
    /**
     * Get the extension from the mime/type
     * Supported types, [Jpeg Png Gif Svg]
     * @param {Object} contentId The id to the image content
     */
    function getExtensionForImage(contentId) {
        const mimeTypes = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/gif': 'gif',
            'image/svg+xml': 'svg',
        };
        const content = libs.content.get({ key: contentId });
        if (content) {
            const imageInfo = content.x && content.x.media ? content.x.media.imageInfo : false;

            if (imageInfo) {
                return mimeTypes[imageInfo.contentType] || '';
            }
        }
        return '';
    }

    /**
     * Get the imageUrl for a contentId, wrapper to portal.imageUrl to handle extensions correctly
     * @param {String} contentId The id of the content.
     * scale is default blank
     */
    function getImageUrl(contentId, scale = '') {
        const extension = getExtensionForImage(contentId);
        return libs.portal.imageUrl({
            id: contentId,
            format: extension,
            scale,
        });
    }

    if (!version) {
        log.info('version is off');
    }
    let content = version.content;
    if (content.type === app.name + ':main-article-chapter') {
        content = libs.content.get({
            key: content.data.article,
        });
    }
    const data = content.data;
    const hasFact = !!data.fact;
    let htmlText = data.text;

    // Prosessering av HTML-felter (håndtere url-er inne i html-en) og image-urls
    htmlText = libs.portal.processHtml({
        value: htmlText,
    });

    const htmlFact = hasFact
        ? libs.portal.processHtml({
              value: data.fact,
          })
        : null;

    let imageObj = null;
    if (data.picture?.target) {
        const { caption, altText, target, size } = data.picture;
        const imgClass =
            // eslint-disable-next-line no-nested-ternary
            size === '40' ? 'figure-small' : size === '70' ? 'figure-medium' : 'figure-full';
        imageObj = {
            url: getImageUrl(target, 'max(768)'),
            imgClass,
            caption,
            altText,
        };
    }

    // current model
    return {
        ...getContentInfo(version),
        hasFact,
        htmlFact,
        htmlText,
        imageObj,
        ingress: data.ingress,
    };
};

const dynamicRenderedContentTypes = [
    `${app.name}:dynamic-page`,
    'portal:fragment',
    `${app.name}:content-page-with-sidemenus`,
];

// make a collection of all pagetypes which use the dynamicPage renderer and pass this to the
// template as well
const renderMapping = {
    [`${app.name}:main-article`]: renderMainArticle,
};
dynamicRenderedContentTypes.forEach((contentType) => {
    renderMapping[contentType] = renderDynamicPage;
});

exports.get = (req) => {
    const contentId = req.params.contentId;
    if (!contentId) {
        return {
            contentType: 'text/html',
            body: '<widget class="error">No content selected</widget>',
        };
    }

    const timeline = getTimeline(contentId);
    const models = timeline
        .map((version) => {
            const renderFunction = renderMapping[version.content.type];
            return renderFunction(version);
        })
        .reverse();
    const widgetScriptUrl = libs.portal.assetUrl({ path: 'js/versionHistory.js' });
    return {
        contentType: 'text/html',
        body: thymeleaf.render(view, {
            contentId,
            appName: app.name,
            widgetScriptUrl,
            versions: models,
        }),
    };
};
