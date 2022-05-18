import contentLib from '/lib/xp/content';
import { ContentDescriptor } from 'types/content-types/content-config';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';

const includedContentTypes = ['product-details'].map(
    (contentType) => `${app.name}:${contentType}`
) as ContentDescriptor[];

export const get = (req: XP.Request) => {
    const { secret } = req.headers;
    const { productId: idOrPath } = req.params;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Unauthorized',
            },
            contentType: 'application/json',
        };
    }

    const details = contentLib
        .query({
            start: 0,
            count: 10000,
            contentTypes: includedContentTypes,
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'data.pageUsageReference',
                            values: [idOrPath],
                        },
                    },
                },
            },
        })
        .hits.map((detail) => {
            return runSitecontentGuillotineQuery(detail, 'master');
        });

    return {
        status: 200,
        body: details,
        contentType: 'application/json',
    };
};
