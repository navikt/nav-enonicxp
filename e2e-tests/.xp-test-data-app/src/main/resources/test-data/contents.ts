import * as contentLib from '/lib/xp/content';
import { CreateContentParams, Schedule } from '/lib/xp/content';
import { createOrReplace } from '../utils/content';
import { APP_DESCRIPTOR } from '@constants';
import { ContentDescriptor } from '@navno-types/content-types/content-config';
import { DynamicPage, MainArticle } from '@xp-types/site/content-types';

type CreateParamsWithoutParent<Type extends ContentDescriptor> = Omit<
    CreateContentParams<Type>,
    'parentPath'
>;

export type ContentWithChildren = {
    contentParams: CreateParamsWithoutParent<any>;
    nopublish?: boolean;
    scheduledPublished?: Schedule;
    children?: ContentWithChildren[];
};

export const publishedContentParams: ContentWithChildren[] = [
    {
        contentParams: {
            name: 'www.nav.no',
            contentType: 'portal:site',
            data: {
                siteConfig: {
                    applicationKey: APP_DESCRIPTOR,
                    config: {},
                },
            },
        },
        children: [
            {
                contentParams: {
                    displayName: 'Published content',
                    contentType: 'no.nav.navno:dynamic-page',
                    data: {
                        chatbotToggle: false,
                        feedbackToggle: false,
                        noindex: false,
                        nosnippet: false,
                    } satisfies DynamicPage,
                },
            },
            {
                contentParams: {
                    displayName: 'Content with customPath',
                    contentType: 'no.nav.navno:dynamic-page',
                    data: {
                        chatbotToggle: false,
                        feedbackToggle: false,
                        noindex: false,
                        nosnippet: false,
                        customPath: '/my-custompath',
                    } satisfies DynamicPage,
                },
            },
            {
                contentParams: {
                    displayName: 'Unpublished content',
                    contentType: 'no.nav.navno:dynamic-page',
                    data: {
                        chatbotToggle: false,
                        feedbackToggle: false,
                        noindex: false,
                        nosnippet: false,
                    } satisfies DynamicPage,
                },
                nopublish: true,
            },
            {
                contentParams: {
                    displayName: 'Prepublish for tomorrow',
                    name: 'prepublish-tomorrow',
                    contentType: 'no.nav.navno:dynamic-page',
                    data: {
                        chatbotToggle: false,
                        feedbackToggle: false,
                        noindex: false,
                        nosnippet: false,
                    } satisfies DynamicPage,
                },
                scheduledPublished: {
                    from: new Date(Date.now() + 1000 * 3600 * 24).toISOString(),
                },
            },
            {
                contentParams: {
                    name: 'kontor',
                    contentType: 'base:folder',
                    data: {},
                },
            },
        ],
    },
];

const createContentWithChildren = (
    { contentParams, children, nopublish, scheduledPublished }: ContentWithChildren,
    parentPath: string
) => {
    const content = createOrReplace({ ...contentParams, parentPath });

    if (!nopublish) {
        contentLib.publish({ keys: [content._id], schedule: scheduledPublished });
    }

    if (children) {
        children.forEach((child) => createContentWithChildren(child, content._path));
    }

    return content;
};

export const initContents = () => {
    publishedContentParams.forEach((contentWithChildren) => {
        createContentWithChildren(contentWithChildren, '/');
    });
};
