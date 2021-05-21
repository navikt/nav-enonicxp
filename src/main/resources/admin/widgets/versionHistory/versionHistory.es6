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
    'section-with-header': {
        render: (content) => `<h2>${content.title}</h2>`,
    },
    'html-area': {
        fields: {},
        render: (content) => libs.portal.processHtml({ value: content.html }),
    },
};

const findParts = (obj, [from, to], optionals = {}) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.reduce((acc, item) => {
                if (typeof item === 'object') {
                    switch (item?.type) {
                        case 'layout':
                            acc.push({ ...item, ...optionals });
                            break;
                        case 'part':
                            acc.push({ ...item, ...optionals });
                            break;
                        case 'fragment':
                            // fragments can have versions of themselves, to be able to show the
                            // fragment which was published at the time one needs to specify the given
                            // time one is after. As there can be multiple fragments on a page, in the
                            // timeline we show all the valid fragment-parts within a time-range
                            if (item.fragment?.id) {
                                const timeline = getTimeline(item.fragment?.id);
                                const previousFragments = timeline.reduce(
                                    (data, fragVersion, ix) => {
                                        if (
                                            to >= fragVersion.fromDate &&
                                            (!fragVersion.to || fragVersion.toDate >= from)
                                        ) {
                                            return [
                                                ...data,
                                                ...findParts(
                                                    fragVersion?.content?.components,
                                                    [from, to],
                                                    {
                                                        type: 'fragment',
                                                        from: fragVersion.from,
                                                        to: fragVersion.to,
                                                    }
                                                ),
                                            ];
                                        }
                                        return data;
                                    },
                                    []
                                );
                                if (previousFragments.length === 0) {
                                    // if no previous versions use the latest
                                    const current = libs.content.get({ key: item.fragment?.id });
                                    previousFragments.push(current?.fragment);
                                }

                                acc = [...acc, ...previousFragments];
                            }
                            break;
                        default:
                            break;
                    }
                }
                return acc;
            }, []);
        }
        // if the obj is just a part return it, else search each key for parts
        if (obj?.type === 'part') {
            return [{ ...obj, ...optionals }];
        }

        return Object.keys(obj).reduce((acc, key) => {
            const current = obj[key];
            return [...acc, ...findParts(current, [from, to], optionals)];
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
                return { content: renderer.render(content) };
            }
            // TODO: if no custom renderer, try to see if we have a standard we can use
        }
    }
    return { content: descriptor };
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
        renderType:
            dynamicRenderedContentTypes.indexOf(version.content.type) !== -1 ? 'dynamic' : 'custom',
    };
};

const renderDynamicPage = (version) => {
    // 1. order by path, at least shown relation between parts
    // 2. extract relevant information from the part

    const { components } = version.content;
    const parts = findParts(components, [version.fromDate, version.toDate]);

    const renderedParts = parts
        .map((component) => {
            if (component?.part) {
                if (component.type === 'fragment') {
                    return {
                        ...extractInfoFromPart(component.part),
                        type: 'fragment',
                        to: libs.utils.formatDateTime(component.to),
                        from: libs.utils.formatDateTime(component.from),
                    };
                }
                return extractInfoFromPart(component.part);
            }
            // parts in fragments don't have the extra layer with the data contained within the .part
            // property!!
            if (component?.type === 'part' && component?.descriptor && component?.config) {
                return extractInfoFromPart(component);
            }
            if (component?.layout) {
                return extractInfoFromPart(component.layout);
            }
            log.info(`unknown component: ${JSON.stringify(component)}`);
            return false;
        })
        .filter((item) => !!item);
    return { ...getContentInfo(version), parts: renderedParts };
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
