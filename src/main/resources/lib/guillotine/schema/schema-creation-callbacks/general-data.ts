import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';

export const generalDataCallback: CreationCallback = (context, params) => {
    // 1. Get the id of the content
    // 2. Check the type
    // 3. Find the correct PageMeta
    // 4. Weave pageMeta into data and return;
    params.fields.data.resolve = (env) => {
        log.info('generaldata');
        const { _id: id, type, data } = env.source;
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

        log.info(`New data: ${JSON.stringify(contentMeta)}`);

        return {
            ...env.source.data,
            ...contentMeta,
        };
    };
};
