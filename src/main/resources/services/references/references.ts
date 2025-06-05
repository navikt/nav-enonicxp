import { Request } from '@enonic-types/core';
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
} from '../../lib/reference-search/fragment-references-resolvers';
import { ReferencesFinder } from '../../lib/reference-search/references-finder';
import { isValidBranch } from '../../lib/context/branches';

type ReqParams = Partial<{
    contentId: string;
    locale: string;
    branch: RepoBranch;
}>;

const genericResolver = (contentId: string) => {
    const referencesFinder = new ReferencesFinder({
        contentId,
        withDeepSearch: false,
        logErrorsOnly: true,
    });
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
        default: {
            return {
                generalResolver: genericResolver,
            };
        }
    }
};

export const get = (req: Request) => {
    const { contentId, locale, branch = 'draft' } = req.params as ReqParams;

    if (!contentId) {
        return {
            status: 400,
            body: {
                result: 'error',
                message: `Parameter "contentId" is required`,
            },
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                result: 'error',
                message: `Parameter "locale" is required and must be a valid locale (got ${locale})`,
            },
        };
    }

    if (!isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                result: 'error',
                message: `Parameter "branch" must be a valid branch name (got ${branch})`,
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
                result: 'error',
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
