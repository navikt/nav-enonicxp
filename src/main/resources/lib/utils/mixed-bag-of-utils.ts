export const notNullOrUndefined = <TValue>(value: TValue | null | undefined): value is TValue =>
    value !== null && value !== undefined;

export const generateFulltextQuery = (
    query: string,
    fieldsToSearch: string[],
    logicOp: 'AND' | 'OR'
) => {
    const wordsWithWildcard = query
        ?.split(' ')
        .map((word) => `${word}*`)
        .join(' ');

    return `fulltext("${fieldsToSearch.join(',')}", "${wordsWithWildcard}", "${logicOp}")`;
};
