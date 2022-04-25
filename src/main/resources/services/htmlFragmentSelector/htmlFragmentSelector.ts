import contentLib, { Content } from '/lib/xp/content';
import {
    appendMacroDescriptionToKey,
    findContentsWithFragmentComponent,
    getKeyWithoutMacroDescription,
} from '../../lib/utils/component-utils';
import { forceArray } from '../../lib/utils/nav-utils';
import { findContentsWithFragmentMacro } from '../../lib/htmlarea/htmlarea';
import { getSubPath } from '../service-utils';
import { runInBranchContext } from '../../lib/utils/branch-context';

type Hit = XP.CustomSelectorServiceResponseHit;

const hitFromFragment = (fragment: Content<'portal:fragment'>, withDescription?: boolean): Hit => ({
    id: withDescription
        ? appendMacroDescriptionToKey(fragment._id, fragment.displayName)
        : fragment._id,
    displayName: fragment.displayName,
    description: fragment._path,
});

const selectorHandler = (req: XP.CustomSelectorServiceRequest) => {
    const { query, withDescription, ids } = req.params;

    if (ids) {
        return forceArray(ids).reduce((acc, id) => {
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
        }, [] as Hit[]);
    }

    const htmlFragments = contentLib.query({
        ...(query && { query: `displayName LIKE "*${query}*"` }),
        start: 0,
        count: 10000,
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

const transformContentToResponseData = (contentArray: ReadonlyArray<Content>) => {
    return contentArray.map((content) => ({
        name: content.displayName,
        path: content._path,
        id: content._id,
    }));
};

const getFragmentUsage = (req: XP.CustomSelectorServiceRequest) => {
    const { fragmentId } = req.params;

    if (!fragmentId) {
        return {
            status: 400,
            body: {
                message: 'Invalid fragmentUsage request: missing parameter "fragmentId"',
            },
        };
    }

    const contentWithMacro = findContentsWithFragmentMacro(fragmentId);
    const contentWithComponent = findContentsWithFragmentComponent(fragmentId);

    return {
        status: 200,
        body: {
            macroUsage: transformContentToResponseData(contentWithMacro),
            componentUsage: transformContentToResponseData(contentWithComponent),
        },
    };
};

export const get = (req: XP.CustomSelectorServiceRequest) => {
    const subPath = getSubPath(req);

    return runInBranchContext(() => {
        if (subPath === 'fragmentUsage') {
            return getFragmentUsage(req);
        }

        const hits = selectorHandler(req);

        return {
            status: 200,
            body: {
                total: hits.length,
                count: hits.length,
                hits: hits,
            },
        };
    }, 'master');
};
