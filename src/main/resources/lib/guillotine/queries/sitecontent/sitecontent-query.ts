import { Content } from '/lib/xp/content';
import { runInBranchContext } from '../../../utils/branch-context';
import { RepoBranch } from '../../../../types/common';
import { ContentDescriptor } from '../../../../types/content-types/content-config';
import { guillotineQuery, GuillotineQueryParams } from '../../guillotine-query';
import { getPublishedVersionTimestamps } from '../../../time-travel/version-utils';
import { getPathMapForReferences } from '../../../custom-paths/custom-paths';
import { getBreadcrumbs } from './breadcrumbs';
import { dynamicPageContentTypesSet } from '../../../contenttype-lists';
import { isMedia } from '../../../utils/nav-utils';

const {
    buildFragmentComponentTree,
    buildPageComponentTree,
} = require('/lib/guillotine/utils/process-components');

const globalFragment = require('./legacyFragments/_global');
const { componentsFragment, fragmentComponentsFragment } = require('./legacyFragments/_components');
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
const {
    dynamicPageFragment,
    productPageFragment,
    situationPageFragment,
    themedArticlePageFragment,
    guidePageFragment,
    toolsPageFragment,
} = require('./legacyFragments/dynamicPage');
const globalValueSet = require('./legacyFragments/globalValueSet');
const media = require('./legacyFragments/media');

type BaseQueryParams = Pick<GuillotineQueryParams, 'branch' | 'params' | 'throwOnErrors'>;

const buildPageContentQuery = (contentTypeFragment?: string) =>
    `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${globalFragment}
            ${contentTypeFragment || ''}
            pageAsJson(resolveTemplate: true, resolveFragment: false)
        }
    }
}`;

const contentToQueryFragment: { [type in ContentDescriptor]?: string } = {
    'no.nav.navno:main-article': mainArticle.fragment,
    'no.nav.navno:main-article-chapter': mainArticleChapter.fragment,
    'no.nav.navno:section-page': sectionPage.fragment,
    'no.nav.navno:page-list': pageList.fragment,
    'no.nav.navno:transport-page': transportPage.fragment,
    'no.nav.navno:large-table': largeTable.fragment,
    'no.nav.navno:office-information': officeInformation.fragment,
    'no.nav.navno:publishing-calendar': publishingCalendar.fragment,
    'no.nav.navno:melding': melding.fragment,
    'no.nav.navno:external-link': externalLink.fragment,
    'no.nav.navno:internal-link': internalLink.fragment,
    'no.nav.navno:url': urlFragment.fragment,
    'no.nav.navno:dynamic-page': dynamicPageFragment,
    'no.nav.navno:content-page-with-sidemenus': productPageFragment,
    'no.nav.navno:situation-page': situationPageFragment,
    'no.nav.navno:themed-article-page': themedArticlePageFragment,
    'no.nav.navno:guide-page': guidePageFragment,
    'no.nav.navno:tools-page': toolsPageFragment,
    'no.nav.navno:contact-information': contactInformation.fragment,
    'no.nav.navno:global-value-set': globalValueSet.fragment,
    'portal:fragment': fragmentComponentsFragment,
    'portal:site': '',
};

const contentQueries = Object.entries(contentToQueryFragment).reduce((acc, [type, fragment]) => {
    return { ...acc, [type]: buildPageContentQuery(fragment) };
}, {} as { [type in ContentDescriptor]: string });

const mediaQuery = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${globalFragment}
            ${media.mediaAttachmentFragment}
        }
}`;

const componentsQuery = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${componentsFragment}
        }
    }
}`;

const fragmentComponentsQuery = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${fragmentComponentsFragment}
        }
    }
}`;

export const componentsGuillotineQuery = (baseQueryParams: BaseQueryParams) => {
    const queryParams = {
        ...baseQueryParams,
        query: componentsQuery,
        jsonBaseKeys: ['config'],
    };

    const components = guillotineQuery(queryParams)?.get?.components;

    if (!components) {
        return { components: [], fragments: [] };
    }

    const fragments = components.reduce((acc: any[], component: any): string[] => {
        if (component.type !== 'fragment') {
            return acc;
        }

        const fragment = guillotineQuery({
            ...queryParams,
            query: fragmentComponentsQuery,
            params: { ref: component.fragment.id },
        })?.get;

        return [
            ...acc,
            {
                ...component,
                fragment: buildFragmentComponentTree(fragment.components),
            },
        ];
    }, []);

    return { components, fragments };
};

export const contentGuillotineQuery = (baseContent: Content, branch: RepoBranch) => {
    const { _id, type } = baseContent;

    const baseQueryParams: BaseQueryParams = {
        branch,
        params: { ref: _id },
        throwOnErrors: true,
    };

    // Media types only redirect to the media asset in the frontend and
    // don't require any further processing
    if (isMedia(baseContent)) {
        return guillotineQuery({
            ...baseQueryParams,
            query: mediaQuery,
        })?.get;
    }

    const contentQuery = contentQueries[type];

    if (!contentQuery) {
        return null;
    }

    const contentQueryResult = guillotineQuery({
        ...baseQueryParams,
        query: contentQuery,
        jsonBaseKeys: ['data', 'config', 'page'],
    })?.get;

    if (!contentQueryResult) {
        return null;
    }

    const versionTimestamps = getPublishedVersionTimestamps(_id, branch);

    // This is the preview/editor page for fragments (not user-facing). It requires some
    // special handling for its contained components
    if (type === 'portal:fragment') {
        return {
            ...contentQueryResult,
            fragment: buildFragmentComponentTree(
                contentQueryResult.components,
                contentQueryResult.nestedFragments.filter(
                    (fragment: any) => fragment.type === 'fragment'
                )
            ),
            versionTimestamps,
            components: undefined,
        };
    }

    const breadcrumbs = runInBranchContext(() => getBreadcrumbs(_id), branch);

    const commonFields = {
        ...contentQueryResult,
        pathMap: getPathMapForReferences(_id),
        versionTimestamps,
        ...(breadcrumbs && { breadcrumbs }),
    };

    if (!dynamicPageContentTypesSet[type]) {
        return commonFields;
    }

    const { components, fragments } = componentsGuillotineQuery(baseQueryParams);

    return {
        ...commonFields,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components,
            fragments,
        }),
    };
};

Object.entries(contentQueries).forEach(([key, value]) => {
    log.info(`${key} query size: ${value.length}`);
});

log.info(`Components query size: ${componentsQuery.length}`);

log.info(`Media query size: ${mediaQuery.length}`);
