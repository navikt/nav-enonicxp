import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import formLib from '/lib/guillotine/dynamic/form';
import namingLib from '/lib/guillotine/util/naming';
import {
    CreateObjectTypeParamsGuillotine,
    CreationCallback,
    graphQlCreateObjectType,
} from '../../../utils/creation-callback-utils';
import { logger } from '../../../../utils/logging';
import { CustomContentDescriptor } from '../../../../../types/content-types/content-config';
import { GraphQLResolver } from '/lib/graphql';
import { PageMeta } from '../../../../../site/content-types/page-meta/page-meta';

const PAGE_META_DESCRIPTOR: CustomContentDescriptor = 'no.nav.navno:page-meta';

type PageMetaOption = PageMeta['contentType']['_selected'];

const metaOptionsKeyMap: { [key in CustomContentDescriptor]?: PageMetaOption } = {
    'no.nav.navno:product-page-v2': 'product_page',
    'no.nav.navno:current-topic-page-v2': 'current_topic_page',
    'no.nav.navno:generic-page-v2': 'generic_page',
    'no.nav.navno:guide-page-v2': 'guide_page',
    'no.nav.navno:situation-page-v2': 'situation_page',
    'no.nav.navno:themed-article-page-v2': 'themed_article_page',
};

const getOptionFormItemsForContentType = (contentDescriptor: CustomContentDescriptor) => {
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
    (contentTypeDescriptor: CustomContentDescriptor): CreationCallback =>
    (context, params) => {
        const contentTypeSchema = contentLib.getType(contentTypeDescriptor);
        if (!contentTypeSchema) {
            logger.critical(`Invalid content type descriptor: ${contentTypeDescriptor}`);
            return null;
        }

        const contentDataParams: CreateObjectTypeParamsGuillotine = {
            name: context.uniqueName('Test'),
            description: 'Test description',
            fields: {},
        };

        const contentDataItems = formLib.getFormItems(contentTypeSchema.form);
        const pageMetaItems = getOptionFormItemsForContentType(contentTypeDescriptor);

        if (!pageMetaItems) {
            logger.critical(`No page-meta data found for content type: ${contentTypeDescriptor}`);
            return null;
        }

        [...pageMetaItems, ...contentDataItems].forEach((formItem) => {
            const fieldKey = namingLib.sanitizeText(formItem.name);
            if (contentDataParams.fields[fieldKey]) {
                logger.info(`Field already exists: ${fieldKey}`);
                return;
            }

            contentDataParams.fields[fieldKey] = {
                type: formLib.generateFormItemObjectType(context, fieldKey, formItem),
                args: formLib.generateFormItemArguments(context, formItem),
                resolve: formLib.generateFormItemResolveFunction(formItem),
            };
        }, {});

        const contentDataType = graphQlCreateObjectType(context, contentDataParams);

        params.fields.data = { type: contentDataType };
    };
