import * as contentLib from '/lib/xp/content';
import { isValidLocale } from '../../lib/localization/layers-data';
import { RepoBranch } from '../../types/common';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import {
    runCustomReferencesResolvers,
    ReferencesResolversMap,
} from '../../lib/reference-search/references-finder-custom';
import {
    findContentsWithFragmentComponent,
    findContentsWithFragmentMacro,
} from '../../lib/reference-search/type-specific-resolvers/portal-fragment';
import { findVideoReferences } from '../../lib/reference-search/type-specific-resolvers/video';
import { ReferencesFinder } from '../../lib/reference-search/references-finder';

type ReqParams = Partial<{
    contentId: string;
    locale: string;
    branch: RepoBranch;
}>;

const genericResolver = (contentId: string) => {
    const referencesFinder = new ReferencesFinder({ contentId, withDeepSearch: false });
    return referencesFinder.run();
};

const getResolversForContentType = (
    contentType: ContentDescriptor
): ReferencesResolversMap | null => {
    switch (contentType) {
        case 'portal:fragment': {
            return {
                componentsResolver: findContentsWithFragmentComponent,
                macrosResolver: findContentsWithFragmentMacro,
            };
        }
        case 'no.nav.navno:video': {
            return {
                generalResolver: findVideoReferences,
            };
        }
        default: {
            return {
                generalResolver: genericResolver,
            };
        }
    }
};

export const get = (req: XP.Request) => {
    const { contentId, locale } = req.params as ReqParams;

    if (!contentId) {
        return {
            status: 400,
            body: {
                message: `Parameter "contentId" is required`,
            },
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                message: `Parameter "locale" is required and must be a valid locale (got ${locale})`,
            },
        };
    }

    const content = runInLocaleContext({ locale, branch: 'draft', asAdmin: true }, () => {
        return contentLib.get({ key: contentId });
    });

    if (!content) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                message: `Content not found for "${contentId}" in locale "${locale}"`,
            },
        };
    }

    const resolvers = getResolversForContentType(content.type);

    if (!resolvers) {
        return {
            status: 200,
            contentType: 'application/json',
            body: {
                result: 'notimpl',
            },
        };
    }

    try {
        const references = runCustomReferencesResolvers({ contentId, locale, ...resolvers });
        if (!references) {
            throw new Error('Something went wrong!');
        }

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                result: 'success',
                references,
            },
        };
    } catch (e) {
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                result: 'error',
                message: `Error resolving dependencies for [${locale}] ${contentId}, check logs for details - error: ${e}`,
            },
        };
    }
};
