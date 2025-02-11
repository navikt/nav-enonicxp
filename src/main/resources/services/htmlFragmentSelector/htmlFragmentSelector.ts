import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import {
    appendMacroDescriptionToKey,
    getKeyWithoutMacroDescription,
} from '../../lib/utils/component-utils';
import { customSelectorHitWithLink, customSelectorParseSelectedIdsFromReq } from '../service-utils';
import { runInContext } from '../../lib/context/run-in-context';

type Hit = XP.CustomSelectorServiceResponseHit;

const hitFromFragment = (fragment: Content<'portal:fragment'>, id?: string): Hit =>
    customSelectorHitWithLink(
        {
            // We include the displayName in the macro id attribute to make it easier
            // to determine the selected fragment at a glance in the editor
            id: id || appendMacroDescriptionToKey(fragment._id, fragment.displayName),
            displayName: fragment.displayName,
            description: fragment._path,
        },
        fragment._id
    );

const getSelectedHits = (ids: string[]) =>
    ids.reduce<Hit[]>((acc, id) => {
        const fragmentId = getKeyWithoutMacroDescription(id);
        const fragment = contentLib.get({ key: fragmentId });

        if (fragment?.type === 'portal:fragment') {
            // Keep the existing id, in case the displayName has changed on the fragment.
            acc.push(hitFromFragment(fragment, id));
        }

        return acc;
    }, []);

const getHitsFromQuery = (query?: string) =>
    contentLib
        .query({
            ...(query && { query: `displayName LIKE "*${query}*"` }),
            start: 0,
            count: 1000,
            contentTypes: ['portal:fragment'],
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'components.part.descriptor',
                            values: ['no.nav.navno:html-area'],
                        },
                    },
                    mustNot: {
                        exists: {
                            field: 'components.layout',
                        },
                    },
                },
            },
        })
        .hits.map((fragment) => hitFromFragment(fragment));

export const get = (req: XP.CustomSelectorServiceRequest) => {
    const { query } = req.params;
    const ids = customSelectorParseSelectedIdsFromReq(req);

    const hits = runInContext({ branch: 'main' }, () =>
        ids.length > 0 ? getSelectedHits(ids) : getHitsFromQuery(query)
    );

    return {
        status: 200,
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};
