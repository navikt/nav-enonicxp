import * as contentLib from '/lib/xp/content';
import {
    contentTypesInAllProductsOverviewPages,
    contentTypesInOverviewPages,
} from '../../contenttype-lists';
import { forceArray } from '../../utils/array-utils';
import { Oversikt } from '@xp-types/site/content-types';
import { logger } from '../../utils/logging';

type Args = {
    oversiktType: Oversikt['oversiktType'];
    audience: Oversikt['audience'];
    excludedContentIds: string[];
};

export const getOversiktContent = ({ oversiktType, audience, excludedContentIds }: Args) => {
    const isAllProductsType = oversiktType === 'all_products';

    const query = {
        start: 0,
        count: 1000,
        contentTypes: isAllProductsType
            ? contentTypesInAllProductsOverviewPages
            : contentTypesInOverviewPages,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: forceArray(audience._selected),
                        },
                    },
                    ...(!isAllProductsType
                        ? [
                              {
                                  exists: {
                                      field: `data.${oversiktType}`,
                                  },
                              },
                          ]
                        : []),
                ],
                mustNot: [
                    {
                        hasValue: {
                            field: 'x.no-nav-navno.previewOnly.previewOnly',
                            values: [true],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.hideFromProductlist',
                            values: [true],
                        },
                    },
                    ...(excludedContentIds.length > 0
                        ? [
                              {
                                  hasValue: {
                                      field: '_id',
                                      values: excludedContentIds,
                                  },
                              },
                          ]
                        : []),
                ],
            },
        },
    };

    logger.info(JSON.stringify(query, null, 2));
    return contentLib.query(query).hits;
};
