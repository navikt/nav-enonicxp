import { Request } from '@enonic-types/core';
import * as contentLib from '/lib/xp/content';
import { APP_DESCRIPTOR } from 'lib/constants';
import { stripPathPrefix } from 'lib/paths/path-utils';
import { buildCacheKeyForReqContext } from 'lib/cache/utils';
import { getFromLocalCache } from 'lib/cache/local-cache';

const getOffices = () => {
    const officeInfoContent = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [`${APP_DESCRIPTOR}:office-page`],
        query: '_path LIKE "/content/www.nav.no/kontor/*"',
    }).hits;

    return officeInfoContent.map((content) => ({
        path: stripPathPrefix(content._path),
        enhetNr: content.data.officeNorgData?.data?.enhetNr,
    }));
};

export const get = (req: Request) => {
    const offices = getFromLocalCache(buildCacheKeyForReqContext(req, 'office-info'), getOffices);

    return {
        status: 200,
        contentType: 'application/json',
        body: { offices },
    };
};
