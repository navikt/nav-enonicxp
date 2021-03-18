const portalLib = require('/lib/xp/portal');
const contentLib = require('/lib/xp/content');
const controller = require('/lib/headless/controllers/component-preview-controller');
const {
    createSectionHeaderId,
} = require('/lib/headless/guillotine/schema-creation-callbacks/section-with-header');

const getComponentFromPath = (component, path) => {
    const pathSegments = path.split('/');

    const [region, index] = pathSegments[0] === '' ? pathSegments.slice(1) : pathSegments;

    if (!region) {
        log.info('Region not found!');
        return component;
    }

    const nextComponent = component.regions?.[region]?.components?.[index];

    if (!nextComponent) {
        log.info('Next component not found!');
        return component;
    }

    return getComponentFromPath(nextComponent, pathSegments.slice(3).join('/'));
};

const insertAnchorId = (component) => (content) => {
    const contentComponent = getComponentFromPath(content.page, component.path);
    contentComponent.config.anchorId = createSectionHeaderId(contentComponent.config);
    content.page.config.title = 'lol wut';
    content.displayName = 'my name is not my name';
    log.info(`new content: ${JSON.stringify(content)}`);
    return content;
};

exports.get = (req) => {
    if (req.mode === 'edit') {
        const component = portalLib.getComponent();
        if (!component.config.anchorId) {
            log.info(`no anchor id set for ${component.path}`);

            const content = portalLib.getContent();
            const newContent = contentLib.modify({
                key: content._id,
                editor: insertAnchorId(component),
            });
            log.info(`modified content: ${JSON.stringify(newContent)}`);
        }
    }

    return controller(req);
};
