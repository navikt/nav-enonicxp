import { ContentNode } from '../../../../../types/content-types/content-config';

export type SearchDocumentFylke = (typeof FYLKER)[number];

const FYLKER = [
    'agder',
    'innlandet',
    'more-og-romsdal',
    'nordland',
    'oslo',
    'rogaland',
    'troms-og-finnmark',
    'trondelag',
    'vest-viken',
    'vestfold-og-telemark',
    'vestland',
    'ost-viken',
] as const;

const localContentPathFilter = new RegExp(/^\/content\/www\.nav\.no\/no\/lokalt\/(([a-z]|-)+)/);

const fylkerSet: ReadonlySet<SearchDocumentFylke> = new Set(FYLKER);

const isFylke = (fylkeOrNot?: string): fylkeOrNot is SearchDocumentFylke => {
    return fylkerSet.has(fylkeOrNot as SearchDocumentFylke);
};

const getFylkeSegment = (content: ContentNode) => content._path.match(localContentPathFilter)?.[1];

export const isExcludedLocalContent = (content: ContentNode) => {
    const fylkePathSegment = getFylkeSegment(content);
    return fylkePathSegment && !isFylke(fylkePathSegment);
};

export const getSearchDocumentFylke = (content: ContentNode) => {
    const fylkePathSegment = getFylkeSegment(content);
    return isFylke(fylkePathSegment) ? fylkePathSegment : undefined;
};
