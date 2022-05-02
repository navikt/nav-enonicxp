import { ContentDescriptor } from '../../../../types/content-types/content-config';

import largeTableQuery from './content-queries/largeTableQuery.graphql';
import urlQuery from './content-queries/urlQuery.graphql';
import portalSiteQuery from './content-queries/portalSiteQuery.graphql';
import transportPageQuery from './content-queries/transportPageQuery.graphql';
import internalLinkQuery from './content-queries/internalLinkQuery.graphql';
import externalLinkQuery from './content-queries/externalLinkQuery.graphql';

export const graphQlContentQueries: { [type in ContentDescriptor]?: string } = {
    'portal:site': portalSiteQuery,
    'no.nav.navno:url': urlQuery,
    'no.nav.navno:large-table': largeTableQuery,
    'no.nav.navno:transport-page': transportPageQuery,
    'no.nav.navno:external-link': externalLinkQuery,
    'no.nav.navno:internal-link': internalLinkQuery,
};
