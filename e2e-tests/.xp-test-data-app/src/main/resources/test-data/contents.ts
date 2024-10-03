import * as contentLib from '/lib/xp/content';
import { Content, CreateContentParams } from '/lib/xp/content';
import { createOrReplace } from '../utils/content';
import { APP_DESCRIPTOR } from '@constants';
import { ContentDescriptor } from '@navno-types/content-types/content-config';

type CreateParamsWithoutParent<Type extends ContentDescriptor> = Omit<
    CreateContentParams<Type>,
    'parentPath'
>;

export type ContentWithChildren = {
    contentParams: CreateParamsWithoutParent<any>;
    children?: ContentWithChildren[];
};

export const createContentParams: ContentWithChildren[] = [
    {
        contentParams: {
            contentType: 'portal:site',
            name: 'www.nav.no',
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
                    contentType: 'base:folder',
                    name: 'kontor',
                    data: {},
                },
            },
            {
                contentParams: {
                    name: 'legacy-content',
                    contentType: 'base:folder',
                    data: {},
                },
                children: [
                    {
                        contentParams: {
                            name: 'main-article',
                            displayName: 'Main article test',
                            contentType: 'no.nav.navno:main-article',
                            data: {
                                contentType: 'lastingContent',
                                subContentType: 'none',
                                chatbotToggle: false,
                                feedbackToggle: false,
                                noindex: false,
                                nosnippet: false,
                                text: 'asdf',
                            } satisfies Content<'no.nav.navno:main-article'>['data'],
                        },
                    },
                ],
            },
        ],
    },
];

const createContentWithChildren = (
    { contentParams, children }: ContentWithChildren,
    parentPath: string
) => {
    const content = createOrReplace({ ...contentParams, parentPath });
    if (children && content) {
        children.forEach((child) => createContentWithChildren(child, content._path));
    }
    return content;
};

export const initContents = () => {
    createContentParams.forEach((contentWithChildren) => {
        const rootContent = createContentWithChildren(contentWithChildren, '/');
        contentLib.publish({ keys: [rootContent._id], includeChildren: true });
    });
};
