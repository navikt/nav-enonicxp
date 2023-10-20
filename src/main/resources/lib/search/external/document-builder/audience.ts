import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { forceArray } from '../../../utils/array-utils';
import { stripPathPrefix } from '../../../paths/path-utils';

type ContentNode = RepoNode<Content>;

export type SearchDocumentAudience =
    | 'privatperson'
    | 'arbeidsgiver'
    | 'samarbeidspartner'
    | 'andre';

const audienceMap: Record<string, SearchDocumentAudience> = {
    person: 'privatperson',
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
    other: 'andre',
} as const;

const pathSegmentToAudience: Record<string, SearchDocumentAudience> = {
    person: 'privatperson',
    samegiella: 'privatperson',
    'work-and-stay-in-norway': 'privatperson',
    'benefits-and-services': 'privatperson',
    'rules-and-regulations': 'privatperson',
    bedrift: 'arbeidsgiver',
    arbeidsgiver: 'arbeidsgiver',
    employers: 'arbeidsgiver',
    samarbeidspartner: 'samarbeidspartner',
    samarbeid: 'samarbeidspartner',
} as const;

const DEFAULT_AUDIENCE = [audienceMap.person];

const getAudienceFromData = (content: ContentNode) => {
    const audience = content.data?.audience;

    if (!audience) {
        return null;
    }

    if (typeof audience === 'string') {
        return [audience];
    }

    if (Array.isArray(audience)) {
        return audience;
    }

    if (audience._selected) {
        return forceArray(audience._selected);
    }

    return null;
};

const getAudienceFromPath = (content: ContentNode) => {
    const pathSegments = stripPathPrefix(content._path).split('/');

    for (const segment of pathSegments) {
        const audienceFromPath = pathSegmentToAudience[segment];
        if (audienceFromPath) {
            return [audienceFromPath];
        }
    }

    return null;
};

export const getSearchDocumentAudience = (content: ContentNode) => {
    return getAudienceFromData(content) || getAudienceFromPath(content) || DEFAULT_AUDIENCE;
};
