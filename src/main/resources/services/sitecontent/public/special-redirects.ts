import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { hasValidCustomPath } from '../../../lib/paths/custom-paths/custom-path-utils';
import { getPublicPath } from '../../../lib/paths/public-path';
import { buildLocalePath, isContentLocalized } from '../../../lib/localization/locale-utils';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { logger } from '../../../lib/utils/logging';
import {
    getContentLocaleRedirectTarget,
    isContentPreviewOnly,
} from '../../../lib/utils/content-utils';
import { transformToRedirect } from '../common/transform-to-redirect';
import { SitecontentResponse } from '../common/content-response';

type Args = {
    content: Content;
    requestedPath: string;
    branch: RepoBranch;
    locale: string;
    isPreview: boolean;
};

type NullableResponse = {
    response: SitecontentResponse;
};

const nullableResponse = (response: SitecontentResponse): NullableResponse => ({
    response,
});

// The previewOnly x-data flag is used on content which should only be publicly accessible
// through the /utkast route in the frontend. Calls from this route comes with the "preview"
// query param. We also want this behaviour for pages with an external redirect url set.
const getPreviewOnlyResponse = ({ content, requestedPath, isPreview }: Args) => {
    const isPreviewOnly = isContentPreviewOnly(content);
    const externalRedirectUrl = content.data?.externalProductUrl;

    if ((isPreviewOnly || !!externalRedirectUrl) === isPreview) {
        return null;
    }

    if (externalRedirectUrl) {
        return nullableResponse(
            transformToRedirect({
                content,
                target: externalRedirectUrl,
                type: 'external',
            })
        );
    }

    // If the content is flagged for preview only we want a 404 response. Otherwise, redirect to the
    // actual content url
    return nullableResponse(
        isPreviewOnly
            ? null
            : transformToRedirect({ content, target: requestedPath, type: 'internal' })
    );
};

// Note: There are legacy office pages still in effect that also have the
// content type office-information. As long as the enhetNr doesn't match up
// with any office-branch content, the next function will pass by these
// office pages.
const getOfficeInfoRedirect = ({ content }: Args) => {
    if (content.type !== 'no.nav.navno:office-information') {
        return null;
    }

    const { enhetNr } = content.data.enhet;

    const foundOfficeContent = contentLib.query({
        start: 0,
        count: 1,
        contentTypes: ['no.nav.navno:office-branch'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.enhetNr',
                        values: [enhetNr],
                    },
                },
            },
        },
    });

    if (foundOfficeContent.hits.length === 0) {
        return null;
    }

    // Try and use the new office branch name, but fall back to the old name if it
    // will return a 404 after redirect.
    const office = foundOfficeContent.hits[0];

    return nullableResponse(
        transformToRedirect({
            content,
            target: office._path,
            type: 'internal',
            isPermanent: true,
        })
    );
};

const getLocaleRedirect = ({ content, locale, branch }: Args) => {
    const localeTarget = getContentLocaleRedirectTarget(content);
    if (!localeTarget || localeTarget === locale) {
        return null;
    }

    const targetContent = runInLocaleContext({ locale: localeTarget, branch }, () =>
        contentLib.get({ key: content._id })
    );
    if (!targetContent || !isContentLocalized(targetContent)) {
        logger.error(
            `Layer redirect was set on ${content._id} to ${localeTarget} but the target locale content was not localized!`
        );
        return null;
    }

    return nullableResponse(
        transformToRedirect({
            content,
            target: getPublicPath(targetContent, localeTarget),
            type: 'internal',
        })
    );
};

// If the content has a custom path, we should redirect requests from the internal _path
const getCustomPathRedirect = ({ content, requestedPath, branch, locale }: Args) => {
    const shouldRedirectToCustomPath =
        hasValidCustomPath(content) &&
        requestedPath === buildLocalePath(content._path, locale) &&
        branch === 'master';

    if (!shouldRedirectToCustomPath) {
        return null;
    }

    return nullableResponse(
        transformToRedirect({
            content,
            target: getPublicPath(content, locale),
            type: 'internal',
        })
    );
};

// Should return null if there is no applicable special response
// The NullableResponse may contain a null-value, indicating that the special response
// should be 404
export const sitecontentSpecialResponse = (args: Args): NullableResponse | null => {
    return (
        getPreviewOnlyResponse(args) ||
        getOfficeInfoRedirect(args) ||
        getLocaleRedirect(args) ||
        getCustomPathRedirect(args)
    );
};
