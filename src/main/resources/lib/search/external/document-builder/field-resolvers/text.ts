import { getNestedValues } from '../../../../utils/object-utils';
import { forceArray } from '../../../../utils/array-utils';
import { ContentNode } from '../../../../../types/content-types/content-config';
import { hasExternalProductUrl } from '../../../../paths/path-utils';
import { NodeComponent } from '../../../../../types/components/component-node';
import { getRepoConnection } from '../../../../utils/repo-utils';
import { getLayersData } from '../../../../localization/layers-data';
import { CONTENT_ROOT_REPO_ID } from '../../../../constants';

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

const resolveProductDetailsContent = (
    component: NodeComponent<'part', 'product-details'>,
    content: ContentNode,
    fieldKeys: string[]
) => {
    const partConfig = component.part.config?.['no-nav-navno']?.['product-details'];
    if (!partConfig) {
        return [];
    }

    const { detailType, processingTimesVisibility } = partConfig;

    const detailId = content.data[detailType];
    if (!detailId) {
        return [];
    }

    const detailContent = getRepoConnection({
        branch: 'master',
        repoId: getLayersData().localeToRepoIdMap[content.language] || CONTENT_ROOT_REPO_ID,
    }).get({ key: detailId });
    if (!detailContent) {
        return [];
    }

    const shouldShowApplications =
        detailType !== 'processing_times' || processingTimesVisibility !== 'complaint';
    const shouldShowComplaints =
        detailType !== 'processing_times' || processingTimesVisibility !== 'application';

    return forceArray(detailContent.components)
        .filter(
            (component) =>
                (component.path.startsWith('/main') && shouldShowApplications) ||
                (component.path.startsWith('/main_complaint') && shouldShowComplaints)
        )
        .map((component) => getComponentFieldValues(component, detailContent, fieldKeys))
        .flat();
};

const isProductDetailsPart = (
    component: NodeComponent
): component is NodeComponent<'part', 'product-details'> =>
    component.type === 'part' && component.part.descriptor === 'no.nav.navno:product-details';

const getComponentFieldValues = (
    component: NodeComponent,
    content: ContentNode,
    fieldKeys: string[]
): string[] => {
    if (component.type === 'fragment') {
        const fragment = getRepoConnection({
            branch: 'master',
            repoId: getLayersData().localeToRepoIdMap[content.language] || CONTENT_ROOT_REPO_ID,
        }).get({ key: component.fragment.id });

        return forceArray(fragment?.components)
            .map((fragmentComponent: NodeComponent) => getFieldValues(fragmentComponent, fieldKeys))
            .flat();
    }

    if (isProductDetailsPart(component)) {
        return resolveProductDetailsContent(component, content, fieldKeys);
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
