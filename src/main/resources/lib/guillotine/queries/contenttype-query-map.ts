import { ContentDescriptor } from '../../../types/content-types/content-config';

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
import portalFragmentQuery from './content-queries/portalFragmentQuery.graphql';

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
    'no.nav.navno:url': urlQuery,
    'no.nav.navno:large-table': largeTableQuery,
    'no.nav.navno:transport-page': transportPageQuery,
    'no.nav.navno:external-link': externalLinkQuery,
    'no.nav.navno:internal-link': internalLinkQuery,
    'no.nav.navno:office-information': officeInformationQuery,
    'no.nav.navno:melding': meldingQuery,
    'no.nav.navno:global-value-set': globalValueSetQuery,
    'no.nav.navno:publishing-calendar': publishingCalendarQuery,
    'no.nav.navno:contact-information': contantInformationQuery,
    'no.nav.navno:page-list': pageListQuery,
    'no.nav.navno:section-page': sectionPageQuery,
    'no.nav.navno:main-article': mainArticleQuery,
    'no.nav.navno:main-article-chapter': mainArticleChapterQuery,
    'portal:site': portalSiteQuery,
    'portal:fragment': portalFragmentQuery,
};
