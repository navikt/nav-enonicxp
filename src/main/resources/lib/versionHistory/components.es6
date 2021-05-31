const { pageUrl, processHtml } = require('/lib/xp/portal');
const { get } = require('/lib/xp/content');
const { getVersionsInRange, wasLiveInRange } = require('/lib/versionHistory');
const { formatDateTime } = require('/lib/nav-utils');

const thymeleaf = require('/lib/thymeleaf');

const htmlArea = {
    fields: {},
    render: (content, [from, to]) => processHtml({ value: content.html }),
};
const sectionWithHeader = {
    render: (content, [from, to]) => `<h2>${content.title}</h2>`,
};
const pageHeader = {
    fields: { title: 'TextLine' },
    render: (content, [from, to]) => `<h1>${content.title}</h1>`,
};
const dynamicHeader = {
    fields: {
        title: '',
        anchorId: '',
        titleTag: '',
    },
};

const dynamicLinkList = {
    render: (content, [from, to]) => {
        const listType = content.list._selected;
        const view = resolve('templates/dynamicLinkList.html');

        let linkList = [];
        if (listType === 'linkList') {
            linkList = content.list.linkList.links.map((link) => {
                if (link._selected === 'internal' && link.internal?.target) {
                    const linkContent = get({ key: link.internal.target });
                    return {
                        text: linkContent ? linkContent.displayName : 'lenke',
                        url: pageUrl({
                            id: link.internal.target,
                        }),
                    };
                }
                if (link._selected === 'external') {
                    const { text, url } = link;
                    return { url, text };
                }
                return false;
            });
        }
        let contentLinks = [];
        let versionedLinks = [];
        if (listType === 'contentList') {
            const contentList = get({ key: content.list?.contentList?.target });
            const timeline = getVersionsInRange(content.list?.contentList?.target, [from, to]);

            const previousContentLists = timeline.map((listVersion, ix) => {
                return {
                    fromDate: listVersion.fromDate,
                    toDate: listVersion.toDate,
                    from: formatDateTime(listVersion.from),
                    to: formatDateTime(listVersion.to),
                    links: listVersion.content?.data?.sectionContents,
                };
            });

            if (previousContentLists.length > 1) {
                versionedLinks = previousContentLists.map((version, ix) => {
                    return {
                        ...version,
                        content: version.links.reverse().reduce((acc, id, i) => {
                            // TODO: for now just checks if the linked content was published in the given timerange
                            // in the future the content should be fetched and the correct displayName
                            // from the correct version displayed
                            if (
                                content.list?.contentList?.numLinks > acc.length &&
                                wasLiveInRange(id, [version.fromDate, version.toDate])
                            ) {
                                const currentContent = get({ key: id });
                                acc.push({
                                    text: currentContent ? currentContent.displayName : 'lenke',
                                    url: pageUrl(id),
                                });
                            }
                            return acc;
                        }, []),
                    };
                });
            } else {
                contentLinks = contentList.data?.sectionContents.map((id, ix) => {
                    if (content.list?.contentList?.numLinks < ix) {
                        const currentContent = get({ key: id });
                        return {
                            text: currentContent ? currentContent.displayName : 'lenke',
                            url: pageUrl(id),
                        };
                    }
                    return false;
                });
            }
        }
        return thymeleaf.render(view, {
            title: processHtml({ value: content.title }),
            links: [...linkList, ...contentLinks].filter((item) => !!item),
            versionedLinks,
        });
    },
};
const renderComponentFromFields = (componentFields, componentData) => {
    const { descriptor } = componentData;
    return `${descriptor} not implemented`;
};

const plainLayouts = ['dynamic-2-col'];
const mapping = {
    'dynamic-header': dynamicHeader,
    'page-header': pageHeader,
    'section-with-header': sectionWithHeader,
    'html-area': htmlArea,
    'dynamic-link-list': dynamicLinkList,
};

const getRenderedComponent = (componentData, [from, to]) => {
    const { descriptor, config } = componentData;
    const descriptorSplit = descriptor.split(':');
    const domain = descriptorSplit[0].replace(/\./g, '-');
    const name = descriptorSplit[1];
    const renderedComponent = { content: descriptor };

    // plain layout without any rendering needed just return empty string
    if (plainLayouts.indexOf(name) !== -1) {
        return { content: '' };
    }

    if (config) {
        let content = config;
        if (config[domain]) {
            content = config[domain][name];
        }
        if (mapping[name]) {
            const renderer = mapping[name];
            if (renderer.render) {
                renderedComponent['content'] = renderer.render(content, [from, to]);
            } else {
                renderedComponent['content'] = renderComponentFromFields(
                    renderer.fields,
                    componentData
                );
            }
        }
    }

    return renderedComponent;
};
module.exports = {
    getRenderedComponent,
};
