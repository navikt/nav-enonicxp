const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');
const { frontendOrigin } = require('/lib/headless/url-origin');
const componentsFragment = require('/lib/headless/guillotine/queries/fragments/_components');
const { getContent } = require('/lib/headless/guillotine/queries/sitecontent');
const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');
const { destructureComponent } = require('/lib/headless/unflatten-components');

const queryGetComponents = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${componentsFragment}
        }
    }
}`;

const fallbackResponse = {
    contentType: 'text/html',
    body: `<div>'Mark as ready for preview'</div>`,
};

// For layout-previews, we need the complete props-tree of the layout, including
// components in the layout regions
const getLayoutComponentProps = (contentId, path) => {
    const pageRegions = getContent(contentId, 'draft')?.page?.regions;

    if (!pageRegions) {
        return null;
    }

    const components = Object.values(pageRegions).reduce((componentsAcc, region) => {
        return [...componentsAcc, ...region.components];
    }, []);

    return components.find((component) => component.type === 'layout' && component.path === path);
};

const getComponentProps = () => {
    const content = portalLib.getContent();
    const component = portalLib.getComponent();

    if (component.type === 'layout') {
        return getLayoutComponentProps(content._id, component.path);
    }

    const response = guillotineQuery(
        queryGetComponents,
        {
            ref: content._id,
        },
        'draft'
    );

    const componentFromGuillotine = response?.get?.components.find(
        (item) => item.path === component.path
    );

    if (!componentFromGuillotine) {
        return null;
    }

    return { ...component, ...destructureComponent(componentFromGuillotine) };
};

// This controller fetches component-HTML from the frontend rendered with the
// supplied props. Used by the content-studio editor.
const componentPreviewController = () => {
    const componentProps = getComponentProps();

    if (!componentProps) {
        log.info('Failed to get component props');
        return fallbackResponse;
    }

    try {
        const componentHtml = httpClient.request({
            url: `${frontendOrigin}/api/component-preview`,
            method: 'POST',
            body: JSON.stringify({ props: componentProps }),
            contentType: 'application/json',
        });

        if (componentHtml?.body) {
            return {
                contentType: 'text/html',
                body: componentHtml.body,
            };
        }
    } catch (e) {
        log.info(`component-preview error: ${e}`);
    }

    log.info(`Failed to fetch HTML-preview for component ${componentProps.descriptor}`);
    return fallbackResponse;
};

module.exports = componentPreviewController;
