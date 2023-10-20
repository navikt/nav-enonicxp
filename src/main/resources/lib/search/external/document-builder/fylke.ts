import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';

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

const fylkerSet: ReadonlySet<SearchDocumentFylke> = new Set(FYLKER);

const isFylke = (fylkeOrNot: string): fylkeOrNot is SearchDocumentFylke => {
    return fylkerSet.has(fylkeOrNot as SearchDocumentFylke);
};

export const getSearchDocumentFylke = (content: RepoNode<Content>) => {
    const fylkePathSegment = content._path.match(
        /\/content\/www\.nav\.no\/no\/lokalt\/(([a-z]|-)+)/
    )?.[1];

    return fylkePathSegment && isFylke(fylkePathSegment) ? fylkePathSegment : undefined;
};
