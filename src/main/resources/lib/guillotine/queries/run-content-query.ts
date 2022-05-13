import { Content } from '/lib/xp/content';
import {
    ContentDescriptor,
    CustomContentDescriptor,
} from '../../../types/content-types/content-config';

import mediaArchiveQuery from './media-queries/mediaArchiveQuery.graphql';
import mediaAudioQuery from './media-queries/mediaAudioQuery.graphql';
import mediaCodeQuery from './media-queries/mediaCodeQuery.graphql';
import mediaDataQuery from './media-queries/mediaDataQuery.graphql';
import mediaDocumentQuery from './media-queries/mediaDocumentQuery.graphql';
import mediaExecutableQuery from './media-queries/mediaExecutableQuery.graphql';
import mediaImageQuery from './media-queries/mediaImageQuery.graphql';
import mediaPresentationQuery from './media-queries/mediaPresentationQuery.graphql';
import mediaSpreadsheetQuery from './media-queries/mediaSpreadsheetQuery.graphql';
import mediaTextQuery from './media-queries/mediaTextQuery.graphql';
import mediaUnknownQuery from './media-queries/mediaUnknownQuery.graphql';
import mediaVectorQuery from './media-queries/mediaVectorQuery.graphql';
import mediaVideoQuery from './media-queries/mediaVideoQuery.graphql';

import largeTableQuery from './content-queries/largeTableQuery.graphql';
import urlQuery from './content-queries/urlQuery.graphql';
import portalSiteQuery from './content-queries/portalSiteQuery.graphql';
import transportPageQuery from './content-queries/transportPageQuery.graphql';
import internalLinkQuery from './content-queries/internalLinkQuery.graphql';
import externalLinkQuery from './content-queries/externalLinkQuery.graphql';
import officeInformationQuery from './content-queries/officeInformationQuery.graphql';
import meldingQuery from './content-queries/meldingQuery.graphql';
import globalValueSetQuery from './content-queries/globalValueSetQuery.graphql';
import publishingCalendarQuery from './content-queries/publishingCalendarQuery.graphql';
import contantInformationQuery from './content-queries/contactInformationQuery.graphql';
import pageListQuery from './content-queries/pageListQuery.graphql';
import sectionPageQuery from './content-queries/sectionPageQuery.graphql';
import mainArticleQuery from './content-queries/mainArticleQuery.graphql';
import mainArticleChapterQuery from './content-queries/mainArticleChapterQuery.graphql';
import productDetailsQuery from './content-queries/productDetailsQuery.graphql';
import portalFragmentQuery from './content-queries/portalFragmentQuery.graphql';
import dynamicPageQuery from './content-queries/dynamicPageQuery.graphql';
import contentPageWithSidemenusQuery from './content-queries/contentPageWithSidemenusQuery.graphql';
import situationPageQuery from './content-queries/situationPageQuery.graphql';
import overviewPageQuery from './content-queries/overviewPageQuery.graphql';
import guidePageQuery from './content-queries/guidePageQuery.graphql';
import themedArticlePageQuery from './content-queries/themedArticlePageQuery.graphql';
import toolsPageQuery from './content-queries/toolsPageQuery.graphql';
import { isMedia } from '../../utils/nav-utils';
import { GuillotineQueryParams, runGuillotineQuery } from '../utils/run-guillotine-query';
import { buildFragmentComponentTree, GuillotineComponent } from '../utils/process-components';
import { runInBranchContext } from '../../utils/branch-context';
import { getBreadcrumbs } from '../utils/breadcrumbs';
import { getPathMapForReferences } from '../../custom-paths/custom-paths';
import { GuillotineUnresolvedComponentType } from './run-sitecontent-query';
import { PortalComponent } from '../../../types/components/component-portal';
import { NodeComponent } from '../../../types/components/component-node';

export const graphQlContentQueries: { [type in ContentDescriptor]?: string } = {
    'media:archive': mediaArchiveQuery,
    'media:audio': mediaAudioQuery,
    'media:code': mediaCodeQuery,
    'media:data': mediaDataQuery,
    'media:document': mediaDocumentQuery,
    'media:executable': mediaExecutableQuery,
    'media:image': mediaImageQuery,
    'media:presentation': mediaPresentationQuery,
    'media:spreadsheet': mediaSpreadsheetQuery,
    'media:text': mediaTextQuery,
    'media:unknown': mediaUnknownQuery,
    'media:vector': mediaVectorQuery,
    'media:video': mediaVideoQuery,
    'no.nav.navno:contact-information': contantInformationQuery,
    'no.nav.navno:content-page-with-sidemenus': contentPageWithSidemenusQuery,
    'no.nav.navno:product-details': productDetailsQuery,
    'no.nav.navno:dynamic-page': dynamicPageQuery,
    'no.nav.navno:external-link': externalLinkQuery,
    'no.nav.navno:internal-link': internalLinkQuery,
    'no.nav.navno:global-value-set': globalValueSetQuery,
    'no.nav.navno:guide-page': guidePageQuery,
    'no.nav.navno:large-table': largeTableQuery,
    'no.nav.navno:main-article': mainArticleQuery,
    'no.nav.navno:main-article-chapter': mainArticleChapterQuery,
    'no.nav.navno:melding': meldingQuery,
    'no.nav.navno:office-information': officeInformationQuery,
    'no.nav.navno:page-list': pageListQuery,
    'no.nav.navno:publishing-calendar': publishingCalendarQuery,
    'no.nav.navno:section-page': sectionPageQuery,
    'no.nav.navno:situation-page': situationPageQuery,
    'no.nav.navno:overview': overviewPageQuery,
    'no.nav.navno:themed-article-page': themedArticlePageQuery,
    'no.nav.navno:tools-page': toolsPageQuery,
    'no.nav.navno:transport-page': transportPageQuery,
    'no.nav.navno:url': urlQuery,
    'portal:fragment': portalFragmentQuery,
    'portal:site': portalSiteQuery,
};

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

export const runGuillotineContentQuery = (
    baseContent: Content,
    baseQueryParams: Omit<GuillotineQueryParams, 'query'>
) => {
    const { _id } = baseContent;

    const contentQuery = graphQlContentQueries[baseContent.type];

    if (!contentQuery) {
        return null;
    }

    // Media types only redirect to the media asset in the frontend and don't require any further processing
    if (isMedia(baseContent)) {
        return runGuillotineQuery({
            ...baseQueryParams,
            query: contentQuery,
        })?.get;
    }

    const contentQueryResult = runGuillotineQuery({
        ...baseQueryParams,
        query: contentQuery,
        jsonBaseKeys: ['data', 'config', 'page'],
    })?.get as GuillotineContentQueryResult;

    if (!contentQueryResult) {
        return null;
    }

    // This is the preview/editor page for fragments (not user-facing). This content type has a slightly
    // different components structure which requires some special handling
    if (contentQueryResult.type === 'portal:fragment') {
        return {
            ...contentQueryResult,
            fragment: buildFragmentComponentTree(
                contentQueryResult.components as GuillotineComponent[],
                contentQueryResult.unresolvedComponentTypes
            ),
            components: undefined,
        };
    }

    const breadcrumbs = runInBranchContext(() => getBreadcrumbs(_id), baseQueryParams.branch);

    return {
        ...contentQueryResult,
        pathMap: getPathMapForReferences(_id),
        ...(breadcrumbs && { breadcrumbs }),
    };
};
