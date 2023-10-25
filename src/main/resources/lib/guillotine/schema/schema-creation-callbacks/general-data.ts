import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';

const contentTypeToSchemaMap: { [key: string]: string } = {
    no_nav_navno_GenericPageV2: 'GenericPage',
    no_nav_navno_ProductPageV2: 'ProductPage',
};

const buildSchemaFromContentType = (contentType: string) => {
    const metaSchema = graphQlLib.reference(
        `no_nav_navno_PageMeta_${contentTypeToSchemaMap[contentType]}`
    );
    const pageSchema = graphQlLib.reference(
        `no_nav_navno_${contentTypeToSchemaMap[contentType]}V2`
    );
    return metaSchema;
};

export const generalDataCallback: CreationCallback = (context, params) => {
    const contentType = params.name;

    // 1. Get the id of the content
    // 2. Check the type
    // 3. Find the correct PageMeta
    // 4. Weave pageMeta into data and return;
    params.fields.data = {
        type: buildSchemaFromContentType(contentType),
        resolve: (env) => {
            const { _id: id, data } = env.source;
            const { pageMeta: pageMetaId } = data;

            if (!pageMetaId) {
                log.error(`No pagemeta id set for content ${id}`);
                return env.source.data;
            }

            const pageMeta = contentLib.get({ key: pageMetaId });

            if (!pageMeta) {
                log.error(`No pagemeta found for content ${id}`);
                return env.source.data;
            }

            const rawData = pageMeta.data.contentType;
            const contentMeta = rawData[rawData._selected];

            return {
                ...env.source.data,
                ...contentMeta,
            };
        },
    };
};
