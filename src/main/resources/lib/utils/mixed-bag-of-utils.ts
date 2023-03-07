import { Content } from '/lib/xp/content';
import { MediaDescriptor } from '../../types/content-types/content-config';

const Thread = Java.type('java.lang.Thread');

export const getCurrentThreadId = () => Number(Thread.currentThread().getId());

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue =>
    value !== null && value !== undefined;

export const isMedia = (content: Content): content is Content<MediaDescriptor> =>
    content.type.startsWith('media:');

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
