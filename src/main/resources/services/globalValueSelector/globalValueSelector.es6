const { getAllGlobalValues } = require('/lib/global-values/global-values');

const getHits = () => {
    const values = getAllGlobalValues();

    const hits = values
        .map((value) => ({
            id: value.globalKey,
            displayName: `${value.textValue} - ${value.setName}`,
            description: `Verdi-sett: ${value.setName}`,
        }))
        .flat();

    return hits;
};

const globalValueSelector = (req) => {
    const hits = getHits();

    log.info(`Hits: ${JSON.stringify(hits)}`);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};

exports.get = globalValueSelector;
