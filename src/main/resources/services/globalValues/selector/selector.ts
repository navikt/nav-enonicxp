import contentLib, { Content } from '/lib/xp/content';
import {
    getGlobalValueItem,
    getGlobalValueUniqueKey,
    getGvKeyAndContentIdFromUniqueKey,
    globalValuesContentType,
} from '../../../lib/utils/global-value-utils';
import { appendMacroDescriptionToKey } from '../../../lib/utils/component-utils';
import { forceArray } from '../../../lib/utils/nav-utils';
import { runInBranchContext } from '../../../lib/utils/branch-context';
import { GlobalValueItem } from '../../../types/content-types/global-value-set';

type Hit = XP.CustomSelectorServiceResponseHit;

const hitFromValueItem = (
    valueItem: GlobalValueItem,
    content: Content,
    withDescription?: boolean
): Hit => {
    const displayName = `${content.displayName} - ${valueItem.itemName}`;
    const key = getGlobalValueUniqueKey(valueItem.key, content._id);

    return {
        id: withDescription ? appendMacroDescriptionToKey(key, displayName) : key,
        displayName: `${displayName} - ${valueItem.key}`,
        description: `${valueItem.itemName} - Verdi: ${valueItem.numberValue}`,
    };
};

const getHitsFromQuery = (query: string | undefined, withDescription?: boolean) => {
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
                            exists: { field: 'data.valueItems' },
                        },
                    ],
                },
            },
        })
        .hits.map((valueSet) =>
            forceArray(valueSet.data.valueItems).map((valueItem) =>
                hitFromValueItem(valueItem, valueSet, withDescription)
            )
        )
        .flat()
        .sort((a, b) => (a.displayName.toLowerCase() > b.displayName.toLowerCase() ? 1 : -1));
};

const getHitsFromSelectedIds = (ids: string | string[], withDescription?: boolean) =>
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
                ...hitFromValueItem(valueItem, content, withDescription),
                id: key,
            },
        ];
    }, [] as Hit[]);

export const globalValueSelectorService = (req: XP.Request) => {
    const { query, ids } = req.params;

    const withDescription = req.params.withDescription === 'true';

    const hits = runInBranchContext(
        () =>
            ids
                ? getHitsFromSelectedIds(ids, withDescription)
                : getHitsFromQuery(query, withDescription),
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
