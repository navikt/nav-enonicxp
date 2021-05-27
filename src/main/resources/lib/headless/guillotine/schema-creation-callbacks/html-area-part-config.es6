const { forceArray } = require('/lib/nav-utils');

const htmlAreaPartConfigCallback = (context, params) => {
    params.fields.filters.resolve = (env) => {
        const filters = env.source?.filters;

        return filters ? forceArray(filters) : null;
    };
};

module.exports = { htmlAreaPartConfigCallback };
