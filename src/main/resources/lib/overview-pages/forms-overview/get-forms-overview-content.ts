import * as contentLib from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { contentTypesInFormsOverviewPages } from '../../contenttype-lists';
import { FormsOverview } from '@xp-types/site/content-types/forms-overview';

type Args = {
    audience: FormsOverview['audience'];
    excludedContentIds: string[];
};

export const getFormsOverviewContent = ({ audience, excludedContentIds }: Args) => {
    const { _selected: selectedAudience } = audience;

    const selectedProviderAudiences =
        selectedAudience === 'provider' &&
        audience.provider.pageType._selected === 'overview' &&
        audience.provider.pageType.overview.provider_audience;

    return contentLib.query({
        count: 2000,
        contentTypes: contentTypesInFormsOverviewPages,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: [selectedAudience],
                        },
                    },
                    ...(selectedProviderAudiences
                        ? [
                              {
                                  hasValue: {
                                      field: 'data.audience.provider.provider_audience',
                                      values: forceArray(selectedProviderAudiences),
                                  },
                              },
                          ]
                        : []),
                    {
                        exists: {
                            field: 'data.formDetailsTargets',
                        },
                    },
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
    }).hits;
};
