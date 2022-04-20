import portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import {
    runComponentsQuery,
    runContentQuery,
} from '../guillotine/queries/sitecontent/sitecontent-query';
import { mergeGuillotineObject } from '../guillotine/utils/merge-json';
import { urls } from '../constants';

const { destructureComponent } = require('/lib/guillotine/utils/process-components');

const fallbackResponse = {
    contentType: 'text/html',
    body: `<div>'Mark as ready for preview'</div>`,
};

// For layout-previews, we need the complete props-tree of the layout, including
// components in the layout regions
const getLayoutComponentProps = (content: Content, path: string) => {
    if (content.type === 'portal:fragment') {
        return content.fragment;
    }

    const pageRegions = runContentQuery(content, 'draft')?.page?.regions as Record<
        string,
        any
    > | null;

    if (!pageRegions) {
        return null;
    }

    const components: any[] = Object.values(pageRegions).reduce(
        (componentsAcc: any, region: any) => {
            return [...componentsAcc, ...region.components];
        },
        [] as any[]
    );

    return components.find(
        (component: any) => component.type === 'layout' && component.path === path
    );
};

const getComponentProps = () => {
    const content = portalLib.getContent();
    const component = portalLib.getComponent();

    if (component.type === 'layout') {
        return getLayoutComponentProps(content, component.path);
    }

    const components = runComponentsQuery({
        params: {
            ref: content._id,
        },
        branch: 'draft',
    });

    const componentPath = component.path || '/';

    const componentFromGuillotine = components?.find((item: any) => item.path === componentPath);

    if (!componentFromGuillotine) {
        return null;
    }

    return {
        language: content.language,
        ...component,
        ...destructureComponent(mergeGuillotineObject(componentFromGuillotine, ['config'])),
    };
};

// This controller fetches component-HTML from the frontend rendered with the
// supplied props. Used by the content-studio editor.
export const componentPreviewController = (req: XP.Request) => {
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
