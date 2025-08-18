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

const buildAudienceFilter = (audience: Oversikt['audience']) => {
    const audienceKeys = audience.map((audience) => audience._selected);
    const audienceProviderSelection = audience.find((item) => item._selected === 'provider');

    const providerSubAudienceKeys =
        audienceProviderSelection?.provider.pageType._selected === 'overview'
            ? forceArray(audienceProviderSelection.provider.pageType.overview.provider_audience)
            : [];

    const audienceIsProvider =
        audienceKeys.includes('provider') && providerSubAudienceKeys.length > 0;

    if (!audienceIsProvider) {
        return {
            hasValue: {
                field: 'data.audience._selected',
                values: audienceKeys,
            },
        };
    }

    const allOtherAudiences = audienceKeys.filter((audience) => audience !== 'provider');
    const filters = [];

    if (allOtherAudiences.length > 0) {
        filters.push({
            hasValue: {
                field: 'data.audience._selected',
                values: allOtherAudiences,
            },
        });
    }

    filters.push({
        boolean: {
            must: [
                {
                    hasValue: {
                        field: 'data.audience._selected',
                        values: ['provider'],
                    },
                },
                {
                    hasValue: {
                        field: 'data.audience.provider.provider_audience',
                        values: providerSubAudienceKeys,
                    },
                },
            ],
        },
    });

    return filters.length === 1
        ? filters[0]
        : {
              boolean: {
                  should: filters,
              },
          };
};

export const getOversiktCategory = (oversiktType: Oversikt['oversiktType']) => {
    switch (oversiktType) {
        case 'application':
        case 'addendum':
        case 'complaint':
            return 'formDetails';
        case 'rates':
        case 'payout_dates':
        case 'processing_times':
            return 'productDetails';
        default:
            return 'basicServices';
    }
};

export const getOversiktContent = ({ oversiktType, audience, excludedContentIds }: Args) => {
    const oversiktCategory = getOversiktCategory(oversiktType);

    const audienceFilter = buildAudienceFilter(forceArray(audience));

    const query = {
        start: 0,
        count: 1000,
        contentTypes:
            oversiktCategory === 'basicServices'
                ? contentTypesInAllProductsOverviewPages
                : contentTypesInOverviewPages,
        filters: {
            boolean: {
                must: [
                    audienceFilter,
                    ...(oversiktCategory === 'productDetails'
                        ? [
                              {
                                  exists: {
                                      field: `data.${oversiktType}`,
                                  },
                              },
                          ]
                        : []),
                    ...(oversiktCategory === 'formDetails'
                        ? [
                              {
                                  exists: {
                                      field: `data.formDetailsTargets`,
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

    return contentLib.query(query).hits;
};
