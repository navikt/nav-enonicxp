import { forceArray } from '../../../../utils/array-utils';
import { stripPathPrefix } from '../../../../paths/path-utils';
import { ContentNode } from '../../../../../types/content-types/content-config';

export type SearchDocumentAudience =
    | 'privatperson'
    | 'arbeidsgiver'
    | 'samarbeidspartner'
    | 'andre';

const dataAudienceToSearchAudience: Record<string, SearchDocumentAudience> = {
    person: 'privatperson',
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
    other: 'andre',
} as const;

const pathSegmentToSearchAudience: Record<string, SearchDocumentAudience> = {
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

const pathSegmentAudienceExclusions: ReadonlySet<string> = new Set(['presse']);

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
        if (pathSegmentAudienceExclusions.has(segment)) {
            return null;
        }
    }

    for (const segment of pathSegments) {
        const audienceFromPath = pathSegmentToSearchAudience[segment];
        if (audienceFromPath) {
            return [audienceFromPath];
        }
    }

    return null;
};

export const getSearchDocumentAudience = (content: ContentNode): SearchDocumentAudience[] => {
    const audienceFromData = getAudienceFromData(content);
    if (audienceFromData) {
        return audienceFromData.map((audience) => dataAudienceToSearchAudience[audience]);
    }

    return getAudienceFromPath(content) || [];
};
