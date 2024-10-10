import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
import { Content, CreateContentParams, Schedule } from '/lib/xp/content';
import { createOrReplace } from '../utils/content';
import { APP_DESCRIPTOR } from '@constants';
import { ContentDescriptor } from '@navno-types/content-types/content-config';
import { DynamicPage, MainArticle } from '@xp-types/site/content-types';
import { languageToLayer } from './layers';

type CreateParamsWithoutParent<Type extends ContentDescriptor> = Omit<
    CreateContentParams<Type>,
    'parentPath'
>;

export type ContentWithChildren = {
    contentParams: CreateParamsWithoutParent<any>;
    nopublish?: boolean;
    scheduledPublished?: Schedule;
    localizedContents?: Partial<Content<any>>[];
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
                localizedContents: [
                    {
                        displayName: 'Published content in english!',
                        language: 'en',
                        data: {},
                    },
                ],
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
    {
        contentParams,
        children,
        nopublish,
        scheduledPublished,
        localizedContents,
    }: ContentWithChildren,
    parentPath: string
) => {
    const content = createOrReplace({ ...contentParams, parentPath });

    if (!nopublish) {
        contentLib.publish({ keys: [content._id], schedule: scheduledPublished });
    }

    localizedContents?.forEach((localizedContent) => {
        const layer = languageToLayer[localizedContent.language as string];
        if (!layer) {
            return;
        }

        contextLib.run({ repository: `com.enonic.cms.${layer.id}` }, () => {
            contentLib.modify({
                key: content._id,
                editor: (rootContent) => {
                    return {
                        ...rootContent,
                        ...localizedContent,
                        inherit: [],
                    };
                },
            });

            if (!nopublish) {
                contentLib.publish({
                    keys: [content._id],
                });
            }
        });
    });

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
