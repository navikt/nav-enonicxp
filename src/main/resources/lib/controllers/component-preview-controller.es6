const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');
const { urls } = require('/lib/constants');
const componentsFragment = require('/lib/guillotine/queries/sitecontent/legacyFragments/_components');
const { mergeGuillotineObjectJson } = require('/lib/guillotine/utils/merge-json');
const { runContentQuery } = require('../guillotine/queries/sitecontent/sitecontent-query');
const { guillotineQuery } = require('/lib/guillotine/guillotine-query');
const { destructureComponent } = require('/lib/guillotine/utils/process-components');

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
const getLayoutComponentProps = (content, path) => {
    if (content.type === 'portal:fragment') {
        return content.fragment;
    }

    const pageRegions = runContentQuery(content._id, 'draft')?.page?.regions;

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
        return getLayoutComponentProps(content, component.path);
    }

    const response = guillotineQuery({
        query: queryGetComponents,
        params: {
            ref: content._id,
        },
        branch: 'draft',
    });

    const componentPath = component.path || '/';

    const componentFromGuillotine = response?.get?.components.find(
        (item) => item.path === componentPath
    );

    if (!componentFromGuillotine) {
        return null;
    }

    return {
        language: content.language,
        ...component,
        ...destructureComponent(mergeGuillotineObjectJson(componentFromGuillotine, ['config'])),
    };
};

// This controller fetches component-HTML from the frontend rendered with the
// supplied props. Used by the content-studio editor.
const componentPreviewController = () => {
    const componentProps = getComponentProps();

    if (!componentProps) {
        log.info('Failed to get component props for preview');
        return fallbackResponse;
    }

    try {
        const componentHtml = httpClient.request({
            url: `${urls.frontendOrigin}/api/component-preview`,
            method: 'POST',
            body: JSON.stringify({ props: componentProps }),
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        if (componentHtml?.body) {
            return {
                contentType: 'text/html',
                body: componentHtml.body,
            };
        }
    } catch (e) {
        log.error(`Error while fetching component preview - ${e}`);
    }

    log.error(`Failed to fetch preview for component ${componentProps.descriptor}`);
    return fallbackResponse;
};

module.exports = componentPreviewController;
