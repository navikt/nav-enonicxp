const thymeleaf = require('/lib/thymeleaf');
const { getTimeline } = require('/lib/versionHistory');

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    audit: require('/lib/xp/auditlog'),
};

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
const view = resolve('versionHistorySimpleView.html');
const translation = {
    'dynamic-header': {
        fields: {
            title: '',
            anchorId: '',
            titleTag: '',
        },
    },
    'page-header': {
        fields: { title: 'TextLine' },
        render: (content) => `<h1>${content.title}</h1>`,
    },
    'html-area': {
        fields: {},
        render: (content) => libs.portal.processHtml({ value: content.html }),
    },
};

const findParts = (obj) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.reduce((acc, item) => {
                if (typeof item === 'object') {
                    if (item?.type === 'part') {
                        acc.push(item);
                    }
                    if (item.type === 'fragment') {
                        if (item.fragment?.id) {
                            const fragData = libs.content.get({ key: item.fragment?.id });
                            acc = [...acc, ...findParts(fragData.fragment)];
                        }
                    }
                }
                return acc;
            }, []);
        }
        // if the obj is just a part return it, else search each key for parts
        if (obj?.type === 'part') {
            return [obj];
        }

        return Object.keys(obj).reduce((acc, key) => {
            const current = obj[key];
            return [...acc, ...findParts(current)];
        }, []);
    }
    log.info(`an object has not been passed: ${JSON.stringify(obj, null, 4)}`);
    return [];
};

const extractInfoFromPart = (part) => {
    const { descriptor, config } = part;
    const descriptorSplit = descriptor.split(':');
    const domain = descriptorSplit[0].replace(/\./g, '-');
    const name = descriptorSplit[1];
    if (config) {
        let content = config;
        if (config[domain]) {
            content = config[domain][name];
        }

        if (translation[name]) {
            const renderer = translation[name];
            if (renderer.render) {
                return renderer.render(content);
            }
            // TODO: if no custom renderer, try to see if we have a standard we can use
        }
    }
    return descriptor;
};

const renderDynamicPage = (version) => {
    // 1. order by path, at least shown relation between parts
    // 2. extract relevant information from the part
    const { components } = version.content;
    const parts = findParts(components);

    const renderedParts = parts.map((part) => {
        if (part?.part) {
            return extractInfoFromPart(part.part);
        }
        // parts in fragments don't have the extra layer with the data contained within the .part
        // property!!
        if (part?.type === 'part' && part?.descriptor && part?.config) {
            return extractInfoFromPart(part);
        }
        return `could not render ${part}`;
    });
    return { ...getContentInfo(version), parts: renderedParts };
};

const getContentInfo = (version) => {
    return {
        description: version.description,
        versionId: version.versionId,
        displayName: version?.content?.displayName,
        from: libs.utils.formatDateTime(version.from),
        publishedFrom: libs.utils.formatDateTime(version.content.publish.from),
        to: libs.utils.formatDateTime(version.to),
        type: version.content.type,
    };
};
const renderMainArticle = (version) => {
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

const renderMapping = {
    [`${app.name}:main-article`]: renderMainArticle,
    [`${app.name}:dynamic-page`]: renderDynamicPage,
    'portal:fragment': renderDynamicPage,
};
exports.get = (req) => {
    const contentId = req.params.contentId;
    if (!contentId) {
        return {
            contentType: 'text/html',
            body: '<widget class="error">No content selected</widget>',
        };
    }
    const content = libs.content.get({ key: contentId });
    const timeline = getTimeline(contentId);
    const renderFunction = renderMapping[content.type];
    const models = timeline.map((version) => renderFunction(version)).reverse();

    const widgetScriptUrl = libs.portal.assetUrl({ path: 'js/versionHistory.js' });
    return {
        contentType: 'text/html',
        body: thymeleaf.render(view, { appName: app.name, widgetScriptUrl, versions: models }),
    };
};
