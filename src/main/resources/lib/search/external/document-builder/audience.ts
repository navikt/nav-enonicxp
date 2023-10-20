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

const DEFAULT_AUDIENCE = [audienceMap.person];

export const getSearchDocumentAudience = (audienceValue: string[]) => {
    if (audienceValue.length === 0) {
        return DEFAULT_AUDIENCE;
    }

    return audienceValue.map((audience) => audienceMap[audience]);
};
