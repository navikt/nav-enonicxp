import portalLib from '/lib/xp/portal';
import httpClient from '/lib/http-client';
import { urls } from '../constants';
import {
    destructureComponent,
    insertComponentsIntoRegions,
} from '../guillotine/utils/process-components';
import { logger } from '../utils/logging';
import { runGuillotineComponentsQuery } from '../guillotine/queries/run-sitecontent-query';

const fallbackResponse = {
    contentType: 'text/html',
    body: `<div>'Kunne ikke laste komponent-oppdateringer - Last inn editoren på nytt (F5) eller trykk "Marker som klar"'</div>`,
};

const getComponentProps = () => {
    const content = portalLib.getContent();
    const portalComponent = portalLib.getComponent();

    const { components, fragments } = runGuillotineComponentsQuery(
        {
            params: {
                ref: content._id,
            },
            branch: 'draft',
        },
        content
    );

    const componentPath = portalComponent.path || '/';

    const componentFromGuillotine = components.find(
        (guillotineComponent: any) => guillotineComponent.path === componentPath
    );

    if (!componentFromGuillotine) {
        return null;
    }

    // Fragments are already fully processed in the components query
    if (componentFromGuillotine.type === 'fragment') {
        return fragments.find((fragment) => fragment.path === componentPath);
    }

    // Layouts must include components in its regions
    if (componentFromGuillotine.type === 'layout') {
        return insertComponentsIntoRegions(portalComponent, components, fragments);
    }

    // Parts need to be destructured into the structure the frontend expects for rendering
    return destructureComponent(componentFromGuillotine);
};

// This controller fetches component-HTML from the frontend rendered with the
// supplied props. Used by the content-studio editor.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const componentPreviewController = (req: XP.Request) => {
    const componentProps = getComponentProps();

    if (!componentProps) {
        logger.warning('Failed to get component props for preview');
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
        logger.error(`Error while fetching component preview - ${e}`);
    }

    logger.error(`Failed to fetch preview for component ${componentProps.descriptor}`);
    return fallbackResponse;
};
