import * as contentLib from '/lib/xp/content';
import { isValidLocale } from '../../lib/localization/layers-data';
import { RepoBranch } from '../../types/common';
import { isValidBranch } from '../../lib/context/branches';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import {
    referencesCheckHandler,
    ReferencesResolvers,
} from '../../lib/reference-search/custom-references-check';
import {
    findContentsWithFragmentComponent,
    findContentsWithFragmentMacro,
} from '../../lib/reference-search/type-specific-resolvers/portal-fragment';
import { findVideoReferences } from '../../lib/reference-search/type-specific-resolvers/video';
import { findProductDetailsReferences } from '../../lib/reference-search/type-specific-resolvers/product-details';

type ReqParams = Partial<{
    contentId: string;
    locale: string;
    branch: RepoBranch;
}>;

const getResolversForContentType = (contentType: ContentDescriptor): ReferencesResolvers | null => {
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
        case 'no.nav.navno:product-details': {
            return {
                generalResolver: findProductDetailsReferences,
            };
        }
        default: {
            return null;
        }
    }
};

export const get = (req: XP.Request) => {
    const { contentId, locale, branch = 'master' } = req.params as ReqParams;

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

    if (!isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: `Parameter "branch" must be a valid branch if specified (got ${branch})`,
            },
        };
    }

    const content = runInLocaleContext({ locale, branch, asAdmin: true }, () => {
        return contentLib.get({ key: contentId });
    });

    if (!content) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                message: `Content not found for "${contentId}" in locale "${locale}" / branch "${branch}"`,
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
        const references = referencesCheckHandler({ contentId, locale, ...resolvers });

        if (!references) {
            return {
                status: 500,
                contentType: 'application/json',
                body: {
                    result: 'error',
                    message: `Something went wrong while resolving dependencies for [${locale}] ${contentId}, check logs for details`,
                },
            };
        }

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                result: 'success',
                refs: references,
            },
        };
    } catch (e) {
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                result: 'error',
                message: `Something went wrong while resolving dependencies for [${locale}] ${contentId}, check logs for details - error: ${e}`,
            },
        };
    }
};
