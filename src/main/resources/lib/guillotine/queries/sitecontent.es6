const contentLib = require('/lib/xp/content');
const { guillotineQuery } = require('/lib/guillotine/guillotine-query');
const { mergeComponentsIntoPage } = require('/lib/guillotine/utils/process-components');
const { getPortalFragmentContent } = require('/lib/guillotine/utils/process-components');
const { runInBranchContext } = require('/lib/utils/branch-context');
const { getBreadcrumbs } = require('../../headless/guillotine/queries/breadcrumbs');
const { getNotifications } = require('/lib/guillotine/queries/notifications');
const { shouldRedirectToCustomPath } = require('/lib/custom-paths/custom-paths');
const {
    getInternalContentPathFromCustomPath,
    getPathMapForReferences,
} = require('/lib/custom-paths/custom-paths');
const { runWithTimeTravel } = require('/lib/time-travel/run-with-time-travel');
const { getVersionTimestamps } = require('/lib/time-travel/version-utils');
const { getModifiedTimeIncludingFragments } = require('/lib/fragments/find-fragments');
const { unhookTimeTravel } = require('/lib/time-travel/run-with-time-travel');
const { validateTimestampConsistency } = require('/lib/time-travel/consistency-check');
const { redirectsPath } = require('../../constants');

const globalFragment = require('../../headless/guillotine/queries/fragments/_global');
const componentsFragment = require('../../headless/guillotine/queries/fragments/_components');
const sectionPage = require('../../headless/guillotine/queries/fragments/sectionPage');
const contentList = require('../../headless/guillotine/queries/fragments/contentList');
const calculator = require('../../headless/guillotine/queries/fragments/calculator');
const contactInformation = require('../../headless/guillotine/queries/fragments/contactInformation');
const internalLink = require('../../headless/guillotine/queries/fragments/internalLink');
const transportPage = require('../../headless/guillotine/queries/fragments/transportPage');
const externalLink = require('../../headless/guillotine/queries/fragments/externalLink');
const pageList = require('../../headless/guillotine/queries/fragments/pageList');
const melding = require('../../headless/guillotine/queries/fragments/melding');
const mainArticle = require('../../headless/guillotine/queries/fragments/mainArticle');
const mainArticleChapter = require('../../headless/guillotine/queries/fragments/mainArticleChapter');
const officeInformation = require('../../headless/guillotine/queries/fragments/officeInformation');
const largeTable = require('../../headless/guillotine/queries/fragments/largeTable');
const publishingCalendar = require('../../headless/guillotine/queries/fragments/publishingCalendar');
const urlFragment = require('../../headless/guillotine/queries/fragments/url');
const dynamicPage = require('../../headless/guillotine/queries/fragments/dynamicPage');
const globalValueSet = require('../../headless/guillotine/queries/fragments/globalValueSet');
const media = require('../../headless/guillotine/queries/fragments/media');
const animatedIconFragment = require('../../headless/guillotine/queries/fragments/animatedIcons');

const queryFragments = [
    globalFragment,
    componentsFragment,
    contentList.fragment,
    calculator.fragment,
    contactInformation.fragment,
    externalLink.fragment,
    internalLink.fragment,
    urlFragment.fragment,
    mainArticle.fragment,
    mainArticleChapter.fragment,
    pageList.fragment,
    sectionPage.fragment,
    transportPage.fragment,
    largeTable.fragment,
    officeInformation.fragment,
    publishingCalendar.fragment,
    melding.fragment,
    dynamicPage.fragment,
    globalValueSet.fragment,
    media.mediaAttachmentFragment,
    animatedIconFragment.fragment,
].join('\n');

const queryGetContentByRef = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${queryFragments}
            pageAsJson(resolveTemplate: true, resolveFragment: false)
            ...on base_Folder {
                children(first:1000) {
                    ${queryFragments}
                }
            }
        }
    }
}`;

const isMedia = (content) => content.__typename?.startsWith('media_');

const getPublishedVersionTimestamps = (contentRef, branch) => {
    // In production, requests from master should not include version timestamps
    // This check must be removed if/when we decide to make version history public
    if (app.config.env === 'p' && branch === 'master') {
        return null;
    }

    return getVersionTimestamps(contentRef, 'master');
};

const getContent = (contentRef, branch) => {
    // Do a contentLib lookup first to check if the content exists.
    // This is much quicker than running a full Guillotine query.
    const rawContent = runInBranchContext(() => contentLib.get({ key: contentRef }), branch);
    if (!rawContent) {
        return null;
    }

    const response = guillotineQuery({
        query: queryGetContentByRef,
        branch,
        params: {
            ref: contentRef,
        },
        jsonBaseKeys: ['data', 'config', 'page'],
        throwOnErrors: true,
    });

    const content = response?.get;
    if (!content) {
        return null;
    }

    if (isMedia(content)) {
        return content;
    }

    const publishedVersionTimestamps = getPublishedVersionTimestamps(contentRef, branch);

    const commonFields = {
        components: undefined,
        pathMap: getPathMapForReferences(contentRef),
        ...(publishedVersionTimestamps && { versionTimestamps: publishedVersionTimestamps }),
    };

    // This is the preview/editor page for fragments (not user-facing). It requires some
    // special handling for its contained components
    if (content.__typename === 'portal_Fragment') {
        return {
            ...getPortalFragmentContent(content),
            ...commonFields,
        };
    }

    const breadcrumbs = runInBranchContext(() => getBreadcrumbs(contentRef), branch);

    return {
        ...content,
        ...commonFields,
        ...(breadcrumbs && { breadcrumbs }),
        page: mergeComponentsIntoPage(content),
    };
};

const getContentFromLegacyPath = (path) => {
    const legacyCmsKeyMatch = /\d+(?=\.cms$)/.exec(path);
    if (!legacyCmsKeyMatch) {
        return null;
    }

    const legacyCmsKey = legacyCmsKeyMatch[0];

    const queryRes = contentLib.query({
        query: `x.no-nav-navno.cmsContent.contentKey LIKE "${legacyCmsKey}"`,
    });

    return queryRes?.hits?.[0];
};

const getRedirectContent = (idOrPath, branch) => {
    const legacyPathTarget = runInBranchContext(() => getContentFromLegacyPath(idOrPath), branch);
    if (legacyPathTarget) {
        return {
            ...legacyPathTarget,
            __typename: 'no_nav_navno_InternalLink',
            data: { target: { _path: legacyPathTarget._path } },
        };
    }

    const pathSegments = idOrPath.split('/');
    const shortUrlPath = pathSegments.length === 3 && pathSegments[2];

    if (shortUrlPath) {
        return getContent(`${redirectsPath}/${shortUrlPath}`, branch);
    }

    return null;
};

const getContentVersionFromTime = (contentRef, branch, time) => {
    const contentRaw = runInBranchContext(() => contentLib.get({ key: contentRef }), branch);
    if (!contentRaw) {
        return null;
    }

    const contentId = contentRaw._id;

    try {
        return runWithTimeTravel(time, branch, contentId, () => {
            const content = getContent(contentId, branch);
            if (!content) {
                return null;
            }

            return {
                ...content,
                livePath: contentRaw._path,
            };
        });
    } catch (e) {
        log.warning(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

const getContentOrRedirect = (contentRef, branch, retries = 2) => {
    const content = getContent(contentRef, branch);

    if (!validateTimestampConsistency(contentRef, content, branch)) {
        if (retries > 0) {
            // In the event that time travel functionality is causing
            // normal requests to retrieve old data, retry the request
            log.error(`Retrying ${retries} more time${retries > 1 ? 's' : ''}`);
            return getContentOrRedirect(contentRef, branch, retries - 1);
        }

        // If no retries left, disable time travel functionality
        log.error(`Time travel permanently disabled on this node`);
        unhookTimeTravel();
        return getContentOrRedirect(contentRef, branch);
    }

    return content
        ? {
              ...content,
              modifiedTime: getModifiedTimeIncludingFragments(contentRef, branch),
          }
        : getRedirectContent(contentRef, branch);
};

const getSiteContent = (requestedPathOrId, branch = 'master', time) => {
    const contentRef = getInternalContentPathFromCustomPath(requestedPathOrId) || requestedPathOrId;

    if (time) {
        return getContentVersionFromTime(contentRef, branch, time);
    }

    const content = getContentOrRedirect(contentRef, branch);

    if (!content) {
        return null;
    }

    // If the content has a custom path, we want to redirect requests from the internal path
    if (shouldRedirectToCustomPath(content, requestedPathOrId, branch)) {
        return {
            ...content,
            __typename: 'no_nav_navno_InternalLink',
            data: { target: { _path: content.data.customPath } },
            page: undefined,
        };
    }

    if (isMedia(content)) {
        return content;
    }

    const notifications = getNotifications(content._path);

    return {
        ...content,
        ...(notifications && { notifications }),
    };
};

module.exports = {
    getSiteContent,
    getContent,
    getRedirectContent,
};
