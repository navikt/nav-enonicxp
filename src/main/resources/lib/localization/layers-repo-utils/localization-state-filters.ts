import { BasicFilters, BooleanFilter } from '/lib/xp/content';
import { NodeQueryParams } from '/lib/xp/node';
import { forceArray } from '../../utils/array-utils';

export type LocalizationState = 'localized' | 'nonlocalized' | 'all';

export const NON_LOCALIZED_QUERY_FILTER: BasicFilters[] = [
    {
        hasValue: {
            field: 'inherit',
            values: ['CONTENT'],
        },
    },
];

const localizationStateFilters: Record<LocalizationState, BooleanFilter['boolean']> = {
    localized: { mustNot: NON_LOCALIZED_QUERY_FILTER },
    nonlocalized: { must: NON_LOCALIZED_QUERY_FILTER },
    all: {},
};

export const insertLocalizationStateFilter = (
    queryParams: NodeQueryParams,
    state: LocalizationState
): NodeQueryParams => {
    if (state === 'all') {
        return queryParams;
    }

    if (!queryParams.filters) {
        queryParams.filters = {} as BooleanFilter;
    }

    const filters = queryParams.filters as BooleanFilter;

    if (!filters.boolean) {
        filters.boolean = {};
    }

    const conditionKey = state === 'localized' ? 'mustNot' : 'must';

    filters.boolean[conditionKey] = [
        ...forceArray(filters.boolean[conditionKey]),
        ...NON_LOCALIZED_QUERY_FILTER,
    ];

    return queryParams;
};
