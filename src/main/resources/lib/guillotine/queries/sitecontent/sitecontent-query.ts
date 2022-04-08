import contentLib from '/lib/xp/content';
import { runInBranchContext } from '../../../utils/branch-context';
import { RepoBranch } from '../../../../types/common';
import { ContentDescriptor } from '../../../../types/content-types/content-config';
import { guillotineQuery } from '../../guillotine-query';
import { getPublishedVersionTimestamps } from '../../../time-travel/version-utils';
import { getPathMapForReferences } from '../../../custom-paths/custom-paths';
import { getBreadcrumbs } from './breadcrumbs';

const { getPortalFragmentContent } = require('/lib/guillotine/utils/process-components');
const { mergeComponentsIntoPage } = require('/lib/guillotine/utils/process-components');

const globalFragment = require('./legacyFragments/_global');
const componentsFragment = require('./legacyFragments/_components');
const sectionPage = require('./legacyFragments/sectionPage');
const contactInformation = require('./legacyFragments/contactInformation');
const internalLink = require('./legacyFragments/internalLink');
const transportPage = require('./legacyFragments/transportPage');
const externalLink = require('./legacyFragments/externalLink');
const pageList = require('./legacyFragments/pageList');
const melding = require('./legacyFragments/melding');
const mainArticle = require('./legacyFragments/mainArticle');
const mainArticleChapter = require('./legacyFragments/mainArticleChapter');
const officeInformation = require('./legacyFragments/officeInformation');
const largeTable = require('./legacyFragments/largeTable');
const publishingCalendar = require('./legacyFragments/publishingCalendar');
const urlFragment = require('./legacyFragments/url');
const dynamicPage = require('./legacyFragments/dynamicPage');
const globalValueSet = require('./legacyFragments/globalValueSet');
const media = require('./legacyFragments/media');
const animatedIconFragment = require('./legacyFragments/animatedIcons');

const commonFragments = [globalFragment, componentsFragment];

const buildPageContentQuery = (contentTypeFragment: string) => `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${commonFragments.join('\n')}
            ${contentTypeFragment}
            pageAsJson(resolveTemplate: true, resolveFragment: false)
        }
    }
}`;

const pageContentQueries: { [type in ContentDescriptor]?: string } = {
    'no.nav.navno:contact-information': buildPageContentQuery(contactInformation.fragment),
    'no.nav.navno:external-link': buildPageContentQuery(externalLink.fragment),
    'no.nav.navno:internal-link': buildPageContentQuery(internalLink.fragment),
    'no.nav.navno:url': buildPageContentQuery(urlFragment.fragment),
    'no.nav.navno:main-article': buildPageContentQuery(mainArticle.fragment),
    'no.nav.navno:main-article-chapter': buildPageContentQuery(mainArticleChapter.fragment),
    'no.nav.navno:page-list': buildPageContentQuery(pageList.fragment),
    'no.nav.navno:section-page': buildPageContentQuery(sectionPage.fragment),
    'no.nav.navno:transport-page': buildPageContentQuery(transportPage.fragment),
    'no.nav.navno:large-table': buildPageContentQuery(largeTable.fragment),
    'no.nav.navno:office-information': buildPageContentQuery(officeInformation.fragment),
    'no.nav.navno:publishing-calendar': buildPageContentQuery(publishingCalendar.fragment),
    'no.nav.navno:melding': buildPageContentQuery(melding.fragment),
    'no.nav.navno:dynamic-page': buildPageContentQuery(dynamicPage.fragment),
    'no.nav.navno:global-value-set': buildPageContentQuery(globalValueSet.fragment),
    'no.nav.navno:animated-icons': buildPageContentQuery(animatedIconFragment.fragment),
};

const mediaContentQuery = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${commonFragments.join('\n')}
            ${media.mediaAttachmentFragment}
        }
}`;

export const runContentQuery = (contentRef: string, branch: RepoBranch) => {
    const contentRaw = runInBranchContext(() => contentLib.get({ key: contentRef }), branch);
    if (!contentRaw) {
        return null;
    }

    const { _id, type } = contentRaw;

    const baseQueryParams = {
        branch,
        params: { ref: _id },
        throwOnErrors: true,
    };

    // Media types only redirect to the media asset in the frontend and
    // don't require any further processing
    if (type.startsWith('media:')) {
        return guillotineQuery({
            ...baseQueryParams,
            query: mediaContentQuery,
        })?.get;
    }

    const contentQuery = pageContentQueries[type];

    if (!contentQuery) {
        return null;
    }

    const queryResult = guillotineQuery({
        ...baseQueryParams,
        query: contentQuery,
        jsonBaseKeys: ['data', 'config', 'page'],
    })?.get;

    if (!queryResult) {
        return null;
    }

    const commonFields = {
        components: undefined,
        pathMap: getPathMapForReferences(contentRef),
        versionTimestamps: getPublishedVersionTimestamps(contentRef, branch),
    };

    // This is the preview/editor page for fragments (not user-facing). It requires some
    // special handling for its contained components
    if (queryResult.__typename === 'portal_Fragment') {
        return {
            ...getPortalFragmentContent(queryResult),
            ...commonFields,
        };
    }

    const breadcrumbs = runInBranchContext(() => getBreadcrumbs(contentRef), branch);

    return {
        ...queryResult,
        ...commonFields,
        ...(breadcrumbs && { breadcrumbs }),
        page: mergeComponentsIntoPage(queryResult),
    };
};
