import { Content } from '/lib/xp/content';
import { runInBranchContext } from '../../../utils/branch-context';
import { RepoBranch } from '../../../../types/common';
import {
    ContentDescriptor,
    CustomContentDescriptor,
} from '../../../../types/content-types/content-config';
import { guillotineQuery, GuillotineQueryParams } from '../../guillotine-query';
import { getPublishedVersionTimestamps } from '../../../time-travel/version-utils';
import { getPathMapForReferences } from '../../../custom-paths/custom-paths';
import { getBreadcrumbs } from './breadcrumbs';
import { dynamicPageContentTypesSet } from '../../../contenttype-lists';
import { isMedia } from '../../../utils/nav-utils';
import { NodeComponent } from '../../../../types/components/component-node';
import { PortalComponent } from '../../../../types/components/component-portal';
import { ComponentType } from '../../../../types/components/component-config';

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
const productOverview = require('./legacyFragments/overview');
const urlFragment = require('./legacyFragments/url');
const {
    dynamicPageFragment,
    productPageFragment,
    situationPageFragment,
    themedArticlePageFragment,
    guidePageFragment,
    toolsPageFragment,
    productDetailsFragment,
} = require('./legacyFragments/dynamicPage');
const globalValueSet = require('./legacyFragments/globalValueSet');
const media = require('./legacyFragments/media');

type BaseQueryParams = Pick<GuillotineQueryParams, 'branch' | 'params' | 'throwOnErrors'>;

export type GuillotineUnresolvedComponentType = { type: ComponentType; path: string };

// TODO: improve these types if/when Guillotine gets better Typescript support
export type GuillotineContentQueryResult =
    | {
          type: CustomContentDescriptor;
          page: PortalComponent<'page'>;
      }
    | {
          type: 'portal:fragment';
          components: NodeComponent[];
          unresolvedComponentTypes: GuillotineUnresolvedComponentType[];
      };

export type GuillotineComponentQueryResult = {
    components: NodeComponent[];
};

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
    'no.nav.navno:product-details': productDetailsFragment.fragment,
    'no.nav.navno:tools-page': toolsPageFragment,
    'no.nav.navno:contact-information': contactInformation.fragment,
    'no.nav.navno:global-value-set': globalValueSet.fragment,
    'no.nav.navno:overview': productOverview.fragment,
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

export const guillotineComponentsQuery = (baseQueryParams: BaseQueryParams) => {
    const queryParams = {
        ...baseQueryParams,
        query: componentsQuery,
        jsonBaseKeys: ['config'],
    };

    const result = guillotineQuery(queryParams)?.get as GuillotineComponentQueryResult;

    if (!result) {
        return { components: [], fragments: [] };
    }

    const { components } = result;

    const deepComponents: NodeComponent[] = components.map((component) => {
        if (component.part?.descriptor === 'no.nav.navno:product-details') {
            const baseContent =
                component.part?.config.no_nav_navno.product_details.productDetailsTarget;

            const page = guillotineContentQuery(
                { type: 'part', path: baseContent._path, ...baseContent },
                baseQueryParams.branch
            );

            component.part.config.no_nav_navno.product_details.productDetailsTarget = page;

            return component;
        }
        return component;
    });

    // Resolve fragments through separate queries to workaround a bug in the Guillotine resolver which prevents
    // nested fragments from resolving
    const fragments = components.reduce((acc, component) => {
        if (component.type !== 'fragment' || !component.fragment?.id) {
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
    }, [] as PortalComponent<'fragment'>[]);

    return { components: deepComponents, fragments };
};

export const guillotineContentQuery = (baseContent: Content, branch: RepoBranch) => {
    const { _id, type } = baseContent;

    const baseQueryParams: BaseQueryParams = {
        branch,
        params: { ref: _id },
        throwOnErrors: true,
    };

    // Media types only redirect to the media asset in the frontend and don't require any further processing
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
    })?.get as GuillotineContentQueryResult;

    if (!contentQueryResult) {
        return null;
    }

    // These are used with the version history selector, and are only included in requests for the draft branch
    // (ie from content studio)
    const versionTimestamps = getPublishedVersionTimestamps(_id, branch);

    // This is the preview/editor page for fragments (not user-facing). This content type has a slightly
    // different components structure which requires some special handling
    if (contentQueryResult.type === 'portal:fragment') {
        return {
            ...contentQueryResult,
            fragment: buildFragmentComponentTree(
                contentQueryResult.components,
                contentQueryResult.unresolvedComponentTypes
            ),
            versionTimestamps,
            components: undefined,
        };
    }

    const breadcrumbs = runInBranchContext(() => getBreadcrumbs(_id), branch);

    const contentWithoutComponents = {
        ...contentQueryResult,
        pathMap: getPathMapForReferences(_id),
        versionTimestamps,
        ...(breadcrumbs && { breadcrumbs }),
    };

    // Skip the components query and processing for content types which are not intended for use
    // with components
    if (!dynamicPageContentTypesSet[type]) {
        return contentWithoutComponents;
    }

    const { components, fragments } = guillotineComponentsQuery(baseQueryParams);

    return {
        ...contentWithoutComponents,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components,
            fragments,
        }),
    };
};
