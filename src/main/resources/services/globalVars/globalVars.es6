const contentLib = require('/lib/xp/content');

const getHits = () => {
    const varSets = contentLib.query({
        start: 0,
        count: 0,
        contentTypes: [`${app.name}:global-vars-set`],
        // sort: env.source.childOrder || 'displayname ASC',
        filters: {
            boolean: {
                must: [
                    {
                        exists: [{ field: 'data.values' }],
                    },
                ],
            },
        },
    }).hits;

    const vars = varSets
        .map((varSet) =>
            varSet.values.map((value) => ({
                id: value.key,
                displayName: `${varSet}`,
            }))
        )
        .flat();

    return [];
};

const globalVarSelector = (req) => {
    log.info(`${JSON.stringify(req)}`);
    const hits = getHits();

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: hits.length,
            count: hits.length,
            hits: [],
        },
    };
};

exports.get = globalVarSelector;
