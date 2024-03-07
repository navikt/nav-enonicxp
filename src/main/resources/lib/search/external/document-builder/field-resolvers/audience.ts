import { forceArray } from '../../../../utils/array-utils';
import { stripPathPrefix } from '../../../../paths/path-utils';
import { ContentNode } from '../../../../../types/content-types/content-config';
import { Audience as AudienceMixin } from '../../../../../site/mixins/audience/audience';
import { ArrayOrSingle } from '../../../../../types/util-types';

type MainAudience = AudienceMixin['audience']['_selected'];

type SubAudience<Audience extends AudienceMixin['audience'] = AudienceMixin['audience']> =
    Audience extends {
        _selected: 'provider';
    }
        ? `provider_${Audience['provider']['provider_audience'][number]}`
        : never;

export type SearchDocumentAudience = MainAudience | SubAudience;

const pathSegmentToSearchAudience: Record<string, SearchDocumentAudience> = {
    person: 'person',
    samegiella: 'person',
    'work-and-stay-in-norway': 'person',
    'benefits-and-services': 'person',
    'rules-and-regulations': 'person',
    bedrift: 'employer',
    arbeidsgiver: 'employer',
    employers: 'employer',
    samarbeidspartner: 'provider',
    samarbeid: 'provider',
} as const;

const pathSegmentAudienceExclusions: ReadonlySet<string> = new Set(['presse']);

const getAudienceFromData = (content: ContentNode): SearchDocumentAudience[] | null => {
    const audience = content.data?.audience as
        | ArrayOrSingle<MainAudience>
        | AudienceMixin['audience']
        | undefined;
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
        const mainAudience = audience._selected;
        if (mainAudience !== 'provider') {
            return forceArray(mainAudience);
        }

        const subAudience = forceArray(audience.provider?.provider_audience).map<SubAudience>(
            (providerAudience) => `provider_${providerAudience}`
        );

        return ['provider', ...subAudience];
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
    return getAudienceFromData(content) || getAudienceFromPath(content) || [];
};
