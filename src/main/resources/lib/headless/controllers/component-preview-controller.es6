const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');
const { frontendOrigin } = require('/lib/headless/url-origin');
const componentsFragment = require('../../../services/sitecontent/fragments/_components');
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

const componentPreviewController = (req) => {
    const content = portalLib.getContent();
    const component = portalLib.getComponent();

    const response = guillotineQuery(
        queryGetComponents,
        {
            ref: content._id,
        },
        req.branch
    );

    const componentFromGuillotine = response?.get?.components.find(
        (item) => item.path === component.path
    );

    if (!componentFromGuillotine) {
        log.info('Failed to get component props from guillotine query');
        return fallbackResponse;
    }

    const componentProps = { ...component, ...destructureComponent(componentFromGuillotine) };

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
                body: `<div>${componentHtml.body}</div>`,
            };
        }
    } catch (e) {
        log.info(`Failed to fetch component preview: ${e}`);
    }

    log.info('Failed to fetch component from frontend');
    return fallbackResponse;
};

module.exports = componentPreviewController;
