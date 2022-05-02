import { ContentDescriptor } from '../../../../types/content-types/content-config';

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

export const graphQlContentQueries: { [type in ContentDescriptor]?: string } = {
    'portal:site': portalSiteQuery,
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
};
