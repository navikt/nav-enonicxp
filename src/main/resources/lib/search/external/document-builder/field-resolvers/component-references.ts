import { Content } from '/lib/xp/content';
import { NodeComponent } from '../../../../../types/components/component-node';
import { ContentNode } from '../../../../../types/content-types/content-config';
import { getRepoConnection } from '../../../../utils/repo-utils';
import { getLayersData } from '../../../../localization/layers-data';
import { CONTENT_ROOT_REPO_ID } from '../../../../constants';
import { forceArray } from '../../../../utils/array-utils';

type ResolvedProductDetails = {
    productDetailsComponents: NodeComponent[];
    productDetailsContent: ContentNode;
};

export const getSearchDocumentProductDetails = (
    component: NodeComponent<'part', 'product-details'>,
    content: ContentNode
): ResolvedProductDetails | null => {
    const partConfig = component.part.config?.['no-nav-navno']?.['product-details'];
    if (!partConfig) {
        return null;
    }

    const { detailType, processingTimesVisibility } = partConfig;

    const detailId = content.data[detailType];
    if (!detailId) {
        return null;
    }

    const detailContent = getRepoConnection({
        branch: 'master',
        repoId: getLayersData().localeToRepoIdMap[content.language] || CONTENT_ROOT_REPO_ID,
    }).get<Content>({ key: detailId });
    if (!detailContent || detailContent.type !== 'no.nav.navno:product-details') {
        return null;
    }

    const shouldShowApplications =
        detailType !== 'processing_times' || processingTimesVisibility !== 'complaint';
    const shouldShowComplaints =
        detailType !== 'processing_times' || processingTimesVisibility !== 'application';

    const components = forceArray(detailContent.components).filter(
        (component) =>
            (component.path.startsWith('/main') && shouldShowApplications) ||
            (component.path.startsWith('/main_complaint') && shouldShowComplaints)
    );

    return { productDetailsComponents: components, productDetailsContent: detailContent };
};

export const getSearchDocumentFormDetails = (
    component: NodeComponent<'part', 'form-details'>,
    content: ContentNode
): string[] => {
    const partConfig = component.part.config?.['no-nav-navno']?.['form-details'];
    if (!partConfig) {
        return [];
    }

    const { showTitle, showIngress, targetFormDetails } = partConfig;
    if (!targetFormDetails || !(showTitle && showIngress)) {
        return [];
    }

    const formContent = getRepoConnection({
        branch: 'master',
        repoId: getLayersData().localeToRepoIdMap[content.language] || CONTENT_ROOT_REPO_ID,
    }).get<Content>({ key: targetFormDetails });
    if (!formContent || formContent.type !== 'no.nav.navno:form-details') {
        return [];
    }

    const { title, longTitle, ingress } = formContent.data;

    const values = [];

    if (showTitle) {
        values.push(longTitle || title);
    }

    if (showIngress && ingress) {
        values.push(ingress);
    }

    return values;
};
