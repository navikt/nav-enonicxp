const { processHtml } = require('/lib/xp/portal');

const htmlArea = {
    fields: {},
    render: (content) => processHtml({ value: content.html }),
};
const sectionWithHeader = {
    render: (content) => `<h2>${content.title}</h2>`,
};
const pageHeader = {
    fields: { title: 'TextLine' },
    render: (content) => `<h1>${content.title}</h1>`,
};
const dynamicHeader = {
    fields: {
        title: '',
        anchorId: '',
        titleTag: '',
    },
};

const renderComponentFromFields = (componentFields, componentData) => {
    const { descriptor } = componentData;
    return `${descriptor} not implemented`;
};

const getRenderedComponent = (componentData) => {
    const translation = {
        'dynamic-header': dynamicHeader,
        'page-header': pageHeader,
        'section-with-header': sectionWithHeader,
        'html-area': htmlArea,
    };

    const { descriptor, config } = componentData;
    const descriptorSplit = descriptor.split(':');
    const domain = descriptorSplit[0].replace(/\./g, '-');
    const name = descriptorSplit[1];
    const renderedComponent = { content: descriptor };
    if (config) {
        let content = config;
        if (config[domain]) {
            content = config[domain][name];
        }
        if (translation[name]) {
            const renderer = translation[name];
            if (renderer.render) {
                renderedComponent['content'] = renderer.render(content);
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
