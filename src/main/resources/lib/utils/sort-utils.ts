import { Content } from '/lib/xp/content';
import { getNestedValues } from './object-utils';

const getTimeFromField = (content: Content, fieldKey: string) => {
    const fieldValue = getNestedValues(content, fieldKey);

    const dateString = typeof fieldValue === 'string' ? fieldValue : content.createdTime;

    return new Date(dateString.split('.')[0]).getTime();
};

export const sortByDateTimeField = (key: string) => (a: Content, b: Content) =>
    getTimeFromField(b, key) - getTimeFromField(a, key);
