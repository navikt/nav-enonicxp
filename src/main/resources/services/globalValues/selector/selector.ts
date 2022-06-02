import contentLib, { Content } from '/lib/xp/content';
import {
    getGlobalValueItem,
    getGlobalValueSet,
    getGlobalValueUniqueKey,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../lib/global-values/global-value-utils';
import { appendMacroDescriptionToKey } from '../../../lib/utils/component-utils';
import { forceArray, generateFulltextQuery } from '../../../lib/utils/nav-utils';
import { runInBranchContext } from '../../../lib/utils/branch-context';
import { GlobalValueItem, GlobalValueContentDescriptor } from '../../../lib/global-values/types';
import { buildGlobalValuePreviewString } from '../../../lib/global-values/macro-preview';
import { customSelectorHitWithLink } from '../../service-utils';
import { contentStudioEditPathPrefix } from '../../../lib/constants';

type Hit = XP.CustomSelectorServiceResponseHit;

type ReqParams = XP.Request['params'] & {
    contentType: GlobalValueContentDescriptor;
};

const hitFromValueItem = (
    valueItem: GlobalValueItem,
    content: Content,
    withDescription?: boolean
): Hit => {
    const displayName = `${content.displayName} - ${valueItem.itemName}`;
    const key = getGlobalValueUniqueKey(valueItem.key, content._id);

    return customSelectorHitWithLink(
        {
            id: withDescription ? appendMacroDescriptionToKey(key, displayName) : key,
            displayName: `${displayName} - ${valueItem.key}`,
            description: buildGlobalValuePreviewString(valueItem),
        },
        `${contentStudioEditPathPrefix}/${content._id}`
    );
};

const getHitsFromQuery = (
    type: GlobalValueContentDescriptor,
    query: string | undefined,
    withDescription?: boolean
) => {
    return contentLib
        .query({
            start: 0,
            count: 10000,
            contentTypes: [type],
            query:
                query &&
                generateFulltextQuery(
                    query,
                    ['data.valueItems.itemName', 'data.valueItems.key', 'displayName'],
                    'AND'
                ),
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

        const content = getGlobalValueSet(contentId);
        if (!content) {
            return acc;
        }

        const valueItem = getGlobalValueItem(gvKey, content);
        if (!valueItem) {
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
    const { query, ids, contentType } = req.params as ReqParams;

    const withDescription = req.params.withDescription === 'true';

    const hits = runInBranchContext(
        () =>
            ids
                ? getHitsFromSelectedIds(ids, withDescription)
                : getHitsFromQuery(contentType, query, withDescription),
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
