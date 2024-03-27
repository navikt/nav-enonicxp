import { getNestedValues } from '../../../utils/object-utils';
import { forceArray } from '../../../utils/array-utils';
import { ContentNode } from '../../../../types/content-types/content-config';
import { hasExternalProductUrl } from '../../../paths/path-utils';
import { NodeComponent } from '../../../../types/components/component-node';
import { getRepoConnection } from '../../../utils/repo-utils';
import { getLayersData } from '../../../localization/layers-data';
import { CONTENT_ROOT_REPO_ID } from '../../../constants';
import {
    getSearchDocumentFormDetails,
    getSearchDocumentProductDetails,
} from './component-references';

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
): string[] => {
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

const isProductDetailsPart = (
    component: NodeComponent
): component is NodeComponent<'part', 'product-details'> =>
    component.type === 'part' && component.part?.descriptor === 'no.nav.navno:product-details';

const isFormDetailsPart = (
    component: NodeComponent
): component is NodeComponent<'part', 'form-details'> =>
    component.type === 'part' && component.part?.descriptor === 'no.nav.navno:form-details';

const getComponentFieldValues = (
    component: NodeComponent,
    content: ContentNode,
    fieldKeys: string[]
): string[] => {
    if (component.type === 'fragment') {
        const locale = content.language || getLayersData().defaultLocale;

        const fragment = getRepoConnection({
            branch: 'master',
            repoId: getLayersData().localeToRepoIdMap[locale] || CONTENT_ROOT_REPO_ID,
        }).get({ key: component.fragment.id });

        return forceArray(fragment?.components)
            .map((fragmentComponent: NodeComponent) => getFieldValues(fragmentComponent, fieldKeys))
            .flat();
    }

    if (isProductDetailsPart(component)) {
        const productDetailsResolved = getSearchDocumentProductDetails(component, content);
        if (!productDetailsResolved) {
            return [];
        }

        const { productDetailsContent, productDetailsComponents } = productDetailsResolved;

        return productDetailsComponents
            .map((productDetailsComponent) =>
                getComponentFieldValues(productDetailsComponent, productDetailsContent, fieldKeys)
            )
            .flat();
    }

    if (isFormDetailsPart(component)) {
        const formDetailsResolved = getSearchDocumentFormDetails(component, content);
        return formDetailsResolved || [];
    }

    return getFieldValues(component, fieldKeys);
};

export const getSearchDocumentTextSegments = (content: ContentNode, fieldKeys: string[]) => {
    const { componentsFieldKeys, otherFieldKeys } = getFieldKeyBuckets(fieldKeys);

    const otherFieldValues = getFieldValues(content, otherFieldKeys);

    // Do not include components data if the content redirects to another page
    // In such cases, the components text will typically be placeholder elements from the page
    // template, or work in progress, which we do not want to index
    if (hasExternalProductUrl(content)) {
        return otherFieldKeys;
    }

    // For component fields, we need to ensure the final order of values are consistent
    // with their original order in the components array
    const componentsFieldValues = forceArray(content.components)
        .map((component) => getComponentFieldValues(component, content, componentsFieldKeys))
        .flat();

    return otherFieldValues.concat(componentsFieldValues);
};
