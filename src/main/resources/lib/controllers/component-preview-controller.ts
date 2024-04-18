import * as portalLib from '/lib/xp/portal';
import httpClient from '/lib/http-client';
import { URLS } from '../constants';
import { logger } from '../utils/logging';
import { runGuillotineComponentPreviewQuery } from '../guillotine/queries/run-sitecontent-query';
import {
    destructureComponent,
    insertComponentsIntoRegions,
} from '../guillotine/utils/process-components';
import { runGuillotineContentQuery } from '../guillotine/queries/run-content-query';
import { Content } from '/lib/xp/portal';

const fallbackResponse = {
    contentType: 'text/html',
    body: `<div>'Kunne ikke laste komponent-oppdateringer - Last inn editoren på nytt (F5) eller trykk "Marker som klar"'</div>`,
};

const getComponentProps = () => {
    const content = portalLib.getContent();
    const portalComponent = portalLib.getComponent();

    if (!content) {
        logger.warning('Could not get content from context!');
        return null;
    }

    if (!portalComponent) {
        logger.warning('Could not get component from context!');
        return null;
    }

    const result = runGuillotineComponentPreviewQuery(content, portalComponent.path);
    if (!result) {
        logger.warning(`Could not resolve component for ${portalComponent.path} ${content._id}`);
        return null;
    }

    const { components, fragments } = result;

    const rootComponent = components.find((component) => component.path === portalComponent.path);
    if (!rootComponent) {
        logger.warning(
            `Root component not found in query result for ${portalComponent.path} ${content._id}`
        );
        return null;
    }

    // Fragments are already fully processed in the components query
    if (rootComponent.type === 'fragment') {
        const rootFragment = fragments.find((fragment) => fragment.path === portalComponent.path);
        if (!rootFragment) {
            logger.warning(
                `Root fragment not found in query result for  ${portalComponent.path} ${content._id}`
            );
        }

        return rootFragment;
    }

    // Layouts must include components in its regions
    if (portalComponent.type === 'layout') {
        return insertComponentsIntoRegions(portalComponent, components, fragments);
    }

    // Parts need to be destructured into the structure the frontend expects for rendering
    return destructureComponent(rootComponent);
};

const getContentProps = (): Content | null => {
    const content = portalLib.getContent();

    if (!content) {
        logger.warning('Could not get content from context!');
        return null;
    }

    return runGuillotineContentQuery(content, {
        branch: 'draft',
        params: {
            ref: content._id,
        },
    });
};

// This controller fetches component-HTML from the frontend rendered with the
// supplied props. Used by the content-studio editor.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const componentPreviewController = (_: XP.Request) => {
    const componentProps = getComponentProps();

    if (!componentProps) {
        logger.warning('Failed to get component props for preview');
        return fallbackResponse;
    }

    try {
        const componentHtml = httpClient.request({
            url: `${URLS.FRONTEND_ORIGIN}/api/component-preview`,
            method: 'POST',
            body: JSON.stringify({
                props: componentProps,
                contentProps: getContentProps(),
            }),
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
