import * as contentLib from '/lib/xp/content';
import formLib from '/lib/guillotine/dynamic/form';
import namingLib from '/lib/guillotine/util/naming';
import {
    createContentTypeName,
    CreateObjectTypeParamsGuillotine,
    CreationCallback,
    graphQlCreateObjectType,
} from '../../../utils/creation-callback-utils';
import { logger } from '../../../../utils/logging';
import { CustomContentDescriptor } from '../../../../../types/content-types/content-config';
import { PageMeta } from '../../../../../site/content-types/page-meta/page-meta';

type PageMetaOption = PageMeta['contentType']['_selected'];
type ContentTypesWithPageMeta = keyof typeof metaOptionsKeyMap;

const PAGE_META_DESCRIPTOR: CustomContentDescriptor = 'no.nav.navno:page-meta';

const metaOptionsKeyMap: { [key in CustomContentDescriptor]?: PageMetaOption } = {
    'no.nav.navno:product-page-v2': 'product_page',
    'no.nav.navno:current-topic-page-v2': 'current_topic_page',
    'no.nav.navno:generic-page-v2': 'generic_page',
    'no.nav.navno:guide-page-v2': 'guide_page',
    'no.nav.navno:situation-page-v2': 'situation_page',
    'no.nav.navno:themed-article-page-v2': 'themed_article_page',
};

const getOptionFormItemsForContentType = (contentDescriptor: ContentTypesWithPageMeta) => {
    const pageMetaSchema = contentLib.getType(PAGE_META_DESCRIPTOR);
    if (!pageMetaSchema) {
        logger.critical(`Invalid content type descriptor for page-meta: ${PAGE_META_DESCRIPTOR}`);
        return null;
    }

    const optionKey = metaOptionsKeyMap[contentDescriptor];
    if (!optionKey) {
        logger.critical(`No meta option found for content type ${contentDescriptor}`);
        return null;
    }

    const contentTypeOptionSet = formLib
        .getFormItems(pageMetaSchema.form)
        .find(
            (formItem: any) =>
                formItem.name === 'contentType' && formItem.formItemType === 'OptionSet'
        )
        ?.options?.find((option: any) => option.name === optionKey)?.items;

    return formLib.getFormItems(contentTypeOptionSet);
};

export const contentWithPageMeta =
    (contentTypeDescriptor: ContentTypesWithPageMeta): CreationCallback =>
    (context, params) => {
        const contentTypeSchema = contentLib.getType(contentTypeDescriptor);
        if (!contentTypeSchema) {
            logger.critical(`Invalid content type descriptor: ${contentTypeDescriptor}`);
            return null;
        }

        const metaOptionsKey = metaOptionsKeyMap[contentTypeDescriptor];
        if (!metaOptionsKey) {
            logger.critical(`No page-meta key found for content type: ${contentTypeDescriptor}`);
            return null;
        }

        const pageMetaItems = getOptionFormItemsForContentType(contentTypeDescriptor);
        if (!pageMetaItems) {
            logger.critical(`No page-meta data found for content type: ${contentTypeDescriptor}`);
            return null;
        }

        const contentTypeName = createContentTypeName(contentTypeDescriptor);

        const contentDataParams: CreateObjectTypeParamsGuillotine = {
            name: context.uniqueName(`${contentTypeName}_DataWithPageMeta`),
            description: `Data for ${contentTypeDescriptor} with external page-meta data`,
            fields: {},
        };

        const contentDataItems = formLib.getFormItems(contentTypeSchema.form);

        [...pageMetaItems, ...contentDataItems].forEach((formItem) => {
            const fieldKey = namingLib.sanitizeText(formItem.name);
            if (contentDataParams.fields[fieldKey]) {
                logger.warning(`Field already exists on ${contentTypeDescriptor}: ${fieldKey}`);
                return;
            }

            contentDataParams.fields[fieldKey] = {
                type: formLib.generateFormItemObjectType(context, contentTypeName, formItem),
                args: formLib.generateFormItemArguments(context, formItem),
                resolve: formLib.generateFormItemResolveFunction(formItem),
            };
        }, {});

        params.fields.data = {
            type: graphQlCreateObjectType(context, contentDataParams),
            resolve: (env) => {
                const contentData = env.source.data;

                const pageMetaId = contentData.pageMetaTarget;
                if (!pageMetaId) {
                    return contentData;
                }

                const pageMetaContent = contentLib.get({ key: pageMetaId });
                if (!pageMetaContent || pageMetaContent.type !== PAGE_META_DESCRIPTOR) {
                    logger.info(`No valid page-meta content found ${pageMetaContent?.type}`);
                    return contentData;
                }

                const pageMetaData = (pageMetaContent.data.contentType as any)[metaOptionsKey];
                if (!pageMetaData) {
                    logger.info(`No valid page-meta data found for ${metaOptionsKey}`);
                    return contentData;
                }

                return { ...contentData, ...pageMetaData };
            },
        };
    };
