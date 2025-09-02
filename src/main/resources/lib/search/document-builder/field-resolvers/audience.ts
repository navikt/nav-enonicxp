import { forceArray } from '../../../utils/array-utils';
import { stripPathPrefix } from '../../../paths/path-utils';
import { ContentNode } from '../../../../types/content-types/content-config';
import { Audience as AudienceMixin } from '@xp-types/site/mixins/audience';
import { ArrayOrSingle } from '../../../../types/util-types';

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

const pathStartToSearchAudience = Object.entries({
    '/no/nav-og-samfunn/kontakt-nav/presse': null,
    '/no/samarbeidspartner/presse': null,
    '/no/person/hjelpemidler/nyheter-hele-landet': 'provider',
    '/no/person/innhold-til-person-forside/nyheter': null,
    '/no/nav-og-samfunn/samarbeid/hjelpemidler/leverandorer-av-hjelpemidler':
        'provider_aid_supplier',
    '/no/nav-og-samfunn/samarbeid/for-kommunen': 'provider_municipality_employed',
} satisfies Record<string, SearchDocumentAudience | null>);

const getAudienceFromData = (content: ContentNode<any>): SearchDocumentAudience[] | null => {
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

    const audienceAsArray = forceArray<any>(audience);

    const flatAudience = audienceAsArray.reduce((acc, item) => {
        if (typeof item === 'string') {
            acc.push(item);
        } else if (item && typeof item === 'object' && '_selected' in item) {
            if (item._selected === 'provider') {
                acc.push('provider');

                const subAudience = forceArray(
                    item.provider?.pageType?.overview?.provider_audience
                ).map<SubAudience>((providerAudience) => `provider_${providerAudience}`);

                acc.push(...subAudience);
            } else {
                acc.push(item._selected);
            }
        }
        return acc;
    }, []);

    return flatAudience;
};

const getAudienceFromPath = (content: ContentNode): SearchDocumentAudience[] | null => {
    const path = stripPathPrefix(content._path);

    for (const [pathStart, audience] of pathStartToSearchAudience) {
        if (path.startsWith(pathStart)) {
            return audience ? [audience] : null;
        }
    }

    const pathSegments = path.split('/');

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
