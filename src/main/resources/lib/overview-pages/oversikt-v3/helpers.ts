import * as contentLib from '/lib/xp/content';
import {
    contentTypesInAllProductsOverviewPages,
    contentTypesInOverviewPages,
} from '../../contenttype-lists';
import { forceArray } from '../../utils/array-utils';
import { Oversikt } from '@xp-types/site/content-types';

type Args = {
    oversiktType: Oversikt['oversiktType'];
    audience: Oversikt['audience'];
    excludedContentIds: string[];
};

const buildAudienceFilter = (audience: Oversikt['audience']) => {
    const audienceSelected = audience.map((audience) => audience._selected);
    const audienceProviderSelection = audience.find((item) => item._selected === 'provider');

    const providerSubAudience =
        audienceProviderSelection?.provider.pageType._selected === 'overview'
            ? forceArray(audienceProviderSelection.provider.pageType.overview.provider_audience)
            : [];

    const providerSubAudienceFilter =
        providerSubAudience.length > 1
            ? {
                  hasValue: {
                      field: 'data.audience.provider.overview.provider_audience',
                      values: providerSubAudience.map((item) => item),
                  },
              }
            : {};

    return {
        hasValue: {
            field: 'data.audience._selected',
            values: audienceSelected,
        },
        ...providerSubAudienceFilter,
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

    return contentLib.query(query).hits;
};
