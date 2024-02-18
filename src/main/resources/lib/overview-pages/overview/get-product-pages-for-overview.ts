import * as contentLib from '/lib/xp/content';
import {
    contentTypesInAllProductsPage,
    contentTypesInOverviewPages,
} from '../../contenttype-lists';
import { forceArray } from '../../utils/array-utils';
import { Overview } from '../../../site/content-types/overview/overview';

type Args = {
    overviewType: Overview['overviewType'];
    audience: Overview['audience'];
    excludedContentIds: string[];
};

export const getProductPagesForOverview = ({
    overviewType,
    audience,
    excludedContentIds,
}: Args) => {
    const isAllProductsType = overviewType === 'all_products';

    return contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: isAllProductsType
            ? contentTypesInAllProductsPage
            : contentTypesInOverviewPages,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: forceArray(audience),
                        },
                    },
                    ...(!isAllProductsType
                        ? [
                              {
                                  exists: {
                                      field: `data.${overviewType}`,
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
    }).hits;
};
