const { forceArray } = require('/lib/nav-utils');

const filtersMenuPartConfigCallback = (context, params) => {
    params.fields.categories.resolve = (env) => {
        return forceArray(env.source.categories);
    };
};

const filtersCategoryCallback = (context, params) => {
    params.fields.filters.resolve = (env) => {
        return forceArray(env.source.filters);
    };
};

module.exports = { filtersMenuPartConfigCallback, filtersCategoryCallback };
