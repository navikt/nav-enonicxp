import { Content } from '/lib/xp/content';
import {
    ContentDescriptor,
    CustomContentDescriptor,
} from '../../../types/content-types/content-config';
import { isMedia } from '../../utils/content-utils';
import { GuillotineQueryParams, runGuillotineQuery } from '../utils/run-guillotine-query';
import { buildFragmentComponentTree, GuillotineComponent } from '../utils/process-components';
import { runInContext } from '../../context/run-in-context';
import { getBreadcrumbs } from '../utils/breadcrumbs';
import { GuillotineUnresolvedComponentType } from './run-sitecontent-query';
import { PortalComponent } from '../../../types/components/component-portal';
import { NodeComponent } from '../../../types/components/component-node';

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

import areaPageQuery from './content-queries/areaPageQuery.graphql';
import contactInformationQuery from './content-queries/contactInformationQuery.graphql';
import contentPageWithSidemenusQuery from './content-queries/contentPageWithSidemenusQuery.graphql';
import dynamicPageQuery from './content-queries/dynamicPageQuery.graphql';
import externalLinkQuery from './content-queries/externalLinkQuery.graphql';
import frontPageQuery from './content-queries/frontPageQuery.graphql';
import globalCaseTimeQuery from './content-queries/globalCaseTimeSetQuery.graphql';
import globalValueSetQuery from './content-queries/globalValueSetQuery.graphql';
import guidePageQuery from './content-queries/guidePageQuery.graphql';
import genericPageQuery from './content-queries/genericPageQuery.graphql';
import internalLinkQuery from './content-queries/internalLinkQuery.graphql';
import largeTableQuery from './content-queries/largeTableQuery.graphql';
import mainArticleQuery from './content-queries/mainArticleQuery.graphql';
import mainArticleChapterQuery from './content-queries/mainArticleChapterQuery.graphql';
import meldingQuery from './content-queries/meldingQuery.graphql';
import officeInformationQuery from './content-queries/officeInformationQuery.graphql';
import officeBranchQuery from './content-queries/officeBranchQuery.graphql';
import officeEditorialPageQuery from './content-queries/officeEditorialPageQuery.graphql';
import overviewPageQuery from './content-queries/overviewPageQuery.graphql';
import pageListQuery from './content-queries/pageListQuery.graphql';
import payoutDatesQuery from './content-queries/payoutDatesQuery.graphql';
import portalFragmentQuery from './content-queries/portalFragmentQuery.graphql';
import portalPageTemplateQuery from './content-queries/portalPageTemplateQuery.graphql';
import portalSiteQuery from './content-queries/portalSiteQuery.graphql';
import formDetailsQuery from './content-queries/formDetailsQuery.graphql';
import formIntermediateStepQuery from './content-queries/formIntermediateStepQuery.graphql';
import productDetailsQuery from './content-queries/productDetailsQuery.graphql';
import publishingCalendarQuery from './content-queries/publishingCalendarQuery.graphql';
import publishingCalendarEntryQuery from './content-queries/publishingCalendarEntryQuery.graphql';
import sectionPageQuery from './content-queries/sectionPageQuery.graphql';
import situationPageQuery from './content-queries/situationPageQuery.graphql';
import currentTopicPageQuery from './content-queries/currentTopicPageQuery.graphql';
import themedArticlePageQuery from './content-queries/themedArticlePageQuery.graphql';
import toolsPageQuery from './content-queries/toolsPageQuery.graphql';
import transportPageQuery from './content-queries/transportPageQuery.graphql';
import urlQuery from './content-queries/urlQuery.graphql';
import pressLandingPageQuery from './content-queries/pressLandingPageQuery.graphql';
import formsOverviewQuery from './content-queries/formsOverviewPageQuery.graphql';

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
    'no.nav.navno:area-page': areaPageQuery,
    'no.nav.navno:contact-information': contactInformationQuery,
    'no.nav.navno:content-page-with-sidemenus': contentPageWithSidemenusQuery,
    'no.nav.navno:product-details': productDetailsQuery,
    'no.nav.navno:form-details': formDetailsQuery,
    'no.nav.navno:form-intermediate-step': formIntermediateStepQuery,
    'no.nav.navno:dynamic-page': dynamicPageQuery,
    'no.nav.navno:external-link': externalLinkQuery,
    'no.nav.navno:forms-overview': formsOverviewQuery,
    'no.nav.navno:front-page': frontPageQuery,
    'no.nav.navno:internal-link': internalLinkQuery,
    'no.nav.navno:global-case-time-set': globalCaseTimeQuery,
    'no.nav.navno:global-value-set': globalValueSetQuery,
    'no.nav.navno:guide-page': guidePageQuery,
    'no.nav.navno:generic-page': genericPageQuery,
    'no.nav.navno:large-table': largeTableQuery,
    'no.nav.navno:main-article': mainArticleQuery,
    'no.nav.navno:main-article-chapter': mainArticleChapterQuery,
    'no.nav.navno:melding': meldingQuery,
    'no.nav.navno:office-information': officeInformationQuery,
    'no.nav.navno:office-branch': officeBranchQuery,
    'no.nav.navno:office-editorial-page': officeEditorialPageQuery,
    'no.nav.navno:payout-dates': payoutDatesQuery,
    'no.nav.navno:page-list': pageListQuery,
    'no.nav.navno:publishing-calendar': publishingCalendarQuery,
    'no.nav.navno:publishing-calendar-entry': publishingCalendarEntryQuery,
    'no.nav.navno:section-page': sectionPageQuery,
    'no.nav.navno:situation-page': situationPageQuery,
    'no.nav.navno:current-topic-page': currentTopicPageQuery,
    'no.nav.navno:overview': overviewPageQuery,
    'no.nav.navno:themed-article-page': themedArticlePageQuery,
    'no.nav.navno:tools-page': toolsPageQuery,
    'no.nav.navno:press-landing-page': pressLandingPageQuery,
    'no.nav.navno:transport-page': transportPageQuery,
    'no.nav.navno:url': urlQuery,
    'portal:fragment': portalFragmentQuery,
    'portal:site': portalSiteQuery,
    'portal:page-template': portalPageTemplateQuery,
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

    const breadcrumbs = runInContext({ branch: baseQueryParams.branch }, () => getBreadcrumbs(_id));

    return {
        ...contentQueryResult,
        ...(breadcrumbs && { breadcrumbs }),
    };
};
