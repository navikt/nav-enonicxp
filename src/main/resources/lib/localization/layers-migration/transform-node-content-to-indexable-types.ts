import * as valueLib from '/lib/xp/value';
import { NodeContent } from '/lib/xp/node';
import { isUUID } from '../../utils/uuid';
import { isXpDateTime } from '../../utils/datetime-utils';
import { notNullOrUndefined } from '../../utils/mixed-bag-of-utils';

const getJavaType = (value: string | Date) => {
    if (value instanceof Date || isXpDateTime(value)) {
        return valueLib.instant(value);
    }

    if (isUUID(value)) {
        return valueLib.reference(value);
    }

    return value;
};

const insertJavaTypes = (value: any): any => {
    if (!notNullOrUndefined(value)) {
        return value;
    }

    if (typeof value === 'string' || value instanceof Date) {
        return getJavaType(value);
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => insertJavaTypes(item));
    }

    Object.entries(value).forEach(([objectKey, objectValue]) => {
        (value as Record<string, unknown>)[objectKey] = insertJavaTypes(objectValue);
    });

    return value;
};

// Ensures content id fields are indexed as references, and datetime fields are indexed as datetime instants
export const transformNodeContentToIndexableTypes = (
    content: NodeContent<any>
): NodeContent<any> => {
    const { createdTime, modifiedTime, publish, data, components, x } = content;

    return {
        ...content,
        createdTime: insertJavaTypes(createdTime),
        modifiedTime: insertJavaTypes(modifiedTime),
        publish: insertJavaTypes(publish),
        data: insertJavaTypes(data),
        components: insertJavaTypes(components),
        x: insertJavaTypes(x),
    };
};
