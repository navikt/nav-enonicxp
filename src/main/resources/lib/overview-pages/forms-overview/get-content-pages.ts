import contentLib, { Content } from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { contentTypesInFormsOverviewPages } from '../../contenttype-lists';

export const getFormsOverviewContentPages = (
    overviewContent: Content<'no.nav.navno:forms-overview'>
) => {
    const { audience } = overviewContent.data;

    const { _selected: selectedAudience } = audience;

    const selectedProviderAudiences =
        selectedAudience === 'provider' &&
        audience.provider.pageType._selected === 'overview' &&
        audience.provider.pageType.overview.provider_audience;

    const excludedContent = forceArray(overviewContent.data.excludedContent);

    return contentLib.query({
        count: 2000,
        contentTypes: contentTypesInFormsOverviewPages,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: audience,
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
                            field: 'data.formDetailsTarget',
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
                    ...(excludedContent.length > 0
                        ? [
                              {
                                  hasValue: {
                                      field: '_id',
                                      values: excludedContent,
                                  },
                              },
                          ]
                        : []),
                ],
            },
        },
    }).hits;
};
