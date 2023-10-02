import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import {
    appendMacroDescriptionToKey,
    getKeyWithoutMacroDescription,
} from '../../lib/utils/component-utils';
import { customSelectorHitWithLink } from '../service-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { forceArray } from '../../lib/utils/array-utils';

type Hit = XP.CustomSelectorServiceResponseHit;

const hitFromFragment = (fragment: Content<'portal:fragment'>, withDescription?: boolean): Hit =>
    customSelectorHitWithLink(
        {
            id: withDescription
                ? appendMacroDescriptionToKey(fragment._id, fragment.displayName)
                : fragment._id,
            displayName: fragment.displayName,
            description: fragment._path,
        },
        fragment._id
    );

const getHitsForSelector = (req: XP.CustomSelectorServiceRequest) => {
    const { query, withDescription, ids } = req.params;

    if (ids) {
        return forceArray(ids).reduce<Hit[]>((acc, id) => {
            const fragmentId = getKeyWithoutMacroDescription(id);
            const fragment = contentLib.get({ key: fragmentId });

            if (!fragment || fragment.type !== 'portal:fragment') {
                return acc;
            }

            return [
                ...acc,
                {
                    ...hitFromFragment(fragment),
                    id,
                },
            ];
        }, []);
    }

    const htmlFragments = contentLib.query({
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
    }).hits;

    return htmlFragments.map((fragment) => hitFromFragment(fragment, withDescription === 'true'));
};

export const get = (req: XP.CustomSelectorServiceRequest) => {
    const hits = runInContext({ branch: 'master' }, () => getHitsForSelector(req));

    return {
        status: 200,
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};
