import { Content } from '/lib/xp/content';
import { getNestedValue } from '../nav-utils';

const getTimeFromField = (content: Content, key: string) =>
    new Date(
        getNestedValue(content, key)?.split('.')[0] || content.createdTime?.split('.')[0]
    ).getTime();

export const sortByDateTimeField = (key: string) => (a: Content, b: Content) =>
    getTimeFromField(b, key) - getTimeFromField(a, key);
