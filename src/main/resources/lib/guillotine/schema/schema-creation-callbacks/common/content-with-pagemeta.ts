import * as contentLib from '/lib/xp/content';
import formLib from '/lib/guillotine/dynamic/form';
import namingLib from '/lib/guillotine/util/naming';
import {
    createContentTypeName,
    CreationCallback,
    graphQlCreateObjectType,
} from '../../../utils/creation-callback-utils';
import { logger } from '../../../../utils/logging';
import { contentTypesWithPageMeta } from '../../../../contenttype-lists';
import { resolveContentMetaData } from '../../../../product-utils/content-meta-data';
import { NavNoDescriptor } from '../../../../../types/common';
import { getPageMetaOptionKey } from '../../../../product-utils/product-content-data-types';

type ContentTypesWithPageMeta = (typeof contentTypesWithPageMeta)[number];

const PAGE_META_DESCRIPTOR: NavNoDescriptor<'page-meta'> = 'no.nav.navno:page-meta';

const getOptionFormItemsForContentType = (contentDescriptor: ContentTypesWithPageMeta) => {
    const pageMetaSchema = contentLib.getType(PAGE_META_DESCRIPTOR);
    if (!pageMetaSchema) {
        logger.critical(`Invalid content type descriptor for page-meta: ${PAGE_META_DESCRIPTOR}`);
        return null;
    }

    const optionKey = getPageMetaOptionKey(contentDescriptor);
    if (!optionKey) {
        logger.critical(`No meta option found for content type ${contentDescriptor}`);
        return null;
    }

    const pageMetaOptionItems = formLib
        .getFormItems(pageMetaSchema.form)
        .find(
            (formItem: any) =>
                formItem.name === 'contentType' && formItem.formItemType === 'OptionSet'
        )
        ?.options?.find((option: any) => option.name === optionKey)?.items;

    return pageMetaOptionItems ? formLib.getFormItems(pageMetaOptionItems) : null;
};

export const contentWithPageMeta =
    (contentTypeDescriptor: ContentTypesWithPageMeta): CreationCallback =>
    (context, params) => {
        const contentTypeSchema = contentLib.getType(contentTypeDescriptor);
        if (!contentTypeSchema) {
            logger.critical(`Invalid content type descriptor: ${contentTypeDescriptor}`);
            return;
        }

        const pageMetaItems = getOptionFormItemsForContentType(contentTypeDescriptor);
        if (!pageMetaItems) {
            logger.critical(`No page-meta data found for content type: ${contentTypeDescriptor}`);
            return;
        }

        const contentDataItems = formLib.getFormItems(contentTypeSchema.form);

        const contentTypeName = createContentTypeName(contentTypeDescriptor);

        const fields = [...pageMetaItems, ...contentDataItems].reduce((acc, formItem) => {
            const fieldKey = namingLib.sanitizeText(formItem.name);
            if (acc[fieldKey]) {
                logger.warning(`Field already exists on ${contentTypeDescriptor}: ${fieldKey}`);
            } else {
                acc[fieldKey] = {
                    type: formLib.generateFormItemObjectType(context, contentTypeName, formItem),
                    args: formLib.generateFormItemArguments(context, formItem),
                    resolve: formLib.generateFormItemResolveFunction(formItem),
                };
            }

            return acc;
        }, {});

        params.fields.data = {
            type: graphQlCreateObjectType(context, {
                name: context.uniqueName(`${contentTypeName}_DataWithPageMeta`),
                description: `Data for ${contentTypeDescriptor} with external page-meta data`,
                fields,
            }),
            resolve: (env) => resolveContentMetaData(env.source),
        };
    };
