import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { getNestedValues } from '../../../../utils/object-utils';
import { forceArray } from '../../../../utils/array-utils';

type ContentNode = RepoNode<Content>;

type FieldKeyBuckets = {
    componentsFieldKeys: string[];
    otherFieldKeys: string[];
};

const COMPONENTS_PARENT_FIELD = 'components';

const stripComponentsPrefix = (fieldKey: string) =>
    fieldKey.replace(`${COMPONENTS_PARENT_FIELD}.`, '');

const getFieldKeyBuckets = (fieldKeys: string[]) => {
    return fieldKeys.reduce<FieldKeyBuckets>(
        (acc, key) => {
            if (key.startsWith(COMPONENTS_PARENT_FIELD)) {
                acc.componentsFieldKeys.push(stripComponentsPrefix(key));
            } else {
                acc.otherFieldKeys.push(key);
            }

            return acc;
        },
        {
            componentsFieldKeys: [],
            otherFieldKeys: [],
        }
    );
};

const getFieldValues = (
    contentOrComponent: ContentNode | NonNullable<ContentNode['components']>,
    fieldKeys: string[]
) => {
    return fieldKeys.reduce<string[]>((acc, key) => {
        const value = getNestedValues(contentOrComponent, key);
        if (typeof value === 'string') {
            acc.push(value);
        } else if (Array.isArray(value)) {
            acc.push(...value.filter((item) => typeof item === 'string'));
        }

        return acc;
    }, []);
};

export const getSearchDocumentTextSegments = (content: ContentNode, fieldKeys: string[]) => {
    const { componentsFieldKeys, otherFieldKeys } = getFieldKeyBuckets(fieldKeys);

    const otherFieldValues = getFieldValues(content, otherFieldKeys);

    const componentsFieldValues = forceArray(content.components)
        .map((component) => getFieldValues(component, componentsFieldKeys))
        .flat();

    return otherFieldValues.concat(componentsFieldValues);
};
