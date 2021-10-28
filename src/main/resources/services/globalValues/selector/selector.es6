const contentLib = require('/lib/xp/content');
const {
    getGlobalValueUniqueKey,
    globalValuesContentType,
    getGvKeyAndContentIdFromUniqueKey,
    getGlobalValueItem,
} = require('/lib/global-values/global-values');
const { appendMacroDescriptionToKey } = require('/lib/headless/component-utils');
const { forceArray } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const hitFromValueItem = (valueItem, valueType, content, withDescription) => {
    const displayName = `${content.displayName} - ${valueItem.itemName}`;
    const key = getGlobalValueUniqueKey(valueItem.key, content._id);

    return {
        id: withDescription ? appendMacroDescriptionToKey(key, displayName) : key,
        displayName: `${displayName} - ${valueItem.key}`,
        description: `Verdi: ${valueItem[valueType]}`,
    };
};

const getHitsFromQuery = (query, type, withDescription) => {
    const wordsWithWildcard = query
        ?.split(' ')
        .map((word) => `${word}*`)
        .join(' ');

    return contentLib
        .query({
            start: 0,
            count: 10000,
            contentTypes: [globalValuesContentType],
            query:
                query &&
                `fulltext("data.valueItems.itemName, data.valueItems.key, displayName", "${wordsWithWildcard}", "AND")`,
            filters: {
                boolean: {
                    must: [
                        {
                            exists: [{ field: 'data.valueItems' }],
                        },
                    ],
                },
            },
        })
        .hits.map((valueSet) =>
            forceArray(valueSet.data.valueItems).map((valueItem) =>
                hitFromValueItem(valueItem, type, valueSet, withDescription)
            )
        )
        .flat()
        .sort((a, b) => (a.displayName.toLowerCase() > b.displayName.toLowerCase() ? 1 : -1));
};

const getHitsFromSelectedIds = (ids, valueType, withDescription) =>
    forceArray(ids).reduce((acc, key) => {
        const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(key);

        if (!gvKey || !contentId) {
            return acc;
        }

        const valueItem = getGlobalValueItem(gvKey, contentId);

        if (!valueItem) {
            return acc;
        }

        const content = contentLib.get({ key: contentId });

        if (!content) {
            return acc;
        }

        return [
            ...acc,
            {
                ...hitFromValueItem(valueItem, valueType, content, withDescription),
                id: key,
            },
        ];
    }, []);

const globalValueSelectorService = (req) => {
    const { valueType = 'numberValue', withDescription, query, ids } = req.params;

    const hits = runInBranchContext(
        () =>
            ids
                ? getHitsFromSelectedIds(ids, valueType, withDescription)
                : getHitsFromQuery(query, valueType, withDescription),
        'master'
    );

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

module.exports = { globalValueSelectorService };
