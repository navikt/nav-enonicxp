const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');

const globalValuesContentType = `${app.name}:global-value-set`;
const validTypes = { textValue: true, numberValue: true };

const getGlobalValueUsage = (key) => {
    const result = contentLib.query({
        start: 0,
        count: 10,
        query: `fulltext("data.text, components.part.config.no-nav-navno.html-area.html", "${key}", "AND")`,
    });

    return result.hits.map((content) => ({
        id: content._id,
        path: content._path,
        displayName: content.displayName,
    }));
};

const getAllGlobalValues = () => {
    const valueSets = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [globalValuesContentType],
        filters: {
            boolean: {
                must: [
                    {
                        exists: [{ field: 'data.valueItems' }],
                    },
                ],
            },
        },
    }).hits;

    return valueSets
        .map((varSet) =>
            forceArray(varSet.data?.valueItems).map((value) => ({
                ...value,
                setId: varSet._id,
                setName: varSet.displayName,
            }))
        )
        .flat();
};

const getGlobalValue = (key, type) => {
    if (!validTypes[type]) {
        log.info(`Invalid type ${type} specified for ${key}`);
        return null;
    }

    const values = getAllGlobalValues();
    const foundValue = values.find((value) => value.key === key);
    if (!foundValue) {
        log.info(`Value not found for key ${key}`);
        return null;
    }

    return foundValue[type];
};

const getGlobalValueSet = (contentId) => {
    if (!contentId) {
        return null;
    }

    const content = contentLib.get({ key: contentId });
    if (!content || content.type !== globalValuesContentType) {
        return null;
    }

    return content;
};

module.exports = {
    getAllGlobalValues,
    getGlobalValue,
    getGlobalValueUsage,
    getGlobalValueSet,
};
