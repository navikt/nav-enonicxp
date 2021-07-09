const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');
const deepJsonParser = require('/lib/headless/deep-json-parser');
const { mergeComponentsIntoPage } = require('/lib/headless/process-components');
const { getPortalFragmentContent } = require('/lib/headless/process-components');
const { runInBranchContext } = require('/lib/headless/branch-context');
const menuUtils = require('/lib/menu-utils');
const cache = require('/lib/siteCache');
const { getNotifications } = require('/lib/headless/guillotine/queries/notifications');
const contentLib = require('/lib/xp/content');
const { shouldRedirectToCustomPath } = require('/lib/custom-paths/custom-paths');
const {
    getInternalContentPathFromCustomPath,
    getPathMapForReferences,
} = require('/lib/custom-paths/custom-paths');
const {
    runWithTimeTravelHooks,
    unhookTimeTravel,
} = require('/lib/time-travel/run-with-time-travel-hooks');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');

const contentLibGetOriginal = contentLib.get;
let timeTravelEnabled = true;

const globalFragment = require('./fragments/_global');
const componentsFragment = require('./fragments/_components');
const sectionPage = require('./fragments/sectionPage');
const contentList = require('./fragments/contentList');
const internalLink = require('./fragments/internalLink');
const transportPage = require('./fragments/transportPage');
const externalLink = require('./fragments/externalLink');
const pageList = require('./fragments/pageList');
const melding = require('./fragments/melding');
const mainArticle = require('./fragments/mainArticle');
const mainArticleChapter = require('./fragments/mainArticleChapter');
const officeInformation = require('./fragments/officeInformation');
const largeTable = require('./fragments/largeTable');
const publishingCalendar = require('./fragments/publishingCalendar');
const urlFragment = require('./fragments/url');
const dynamicPage = require('./fragments/dynamicPage');
const globalValueSet = require('./fragments/globalValueSet');
const media = require('./fragments/media');
const animatedIconFragment = require('./fragments/animatedIcons');

const queryFragments = [
    globalFragment,
    componentsFragment,
    contentList.fragment,
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

const getContent = (contentRef, branch) => {
    const response = guillotineQuery(
        queryGetContentByRef,
        {
            ref: contentRef,
        },
        branch
    );

    const content = response?.get;
    if (!content) {
        return null;
    }

    if (isMedia(content)) {
        return content;
    }

    const contentWithParsedData = deepJsonParser(content, ['data', 'config', 'page']);

    if (content.__typename === 'portal_Fragment') {
        return getPortalFragmentContent(contentWithParsedData);
    }

    const page = mergeComponentsIntoPage(contentWithParsedData);
    const breadcrumbs = runInBranchContext(() => menuUtils.getBreadcrumbMenu(contentRef), branch);
    const pathMap = getPathMapForReferences(contentRef);

    return {
        ...contentWithParsedData,
        page,
        components: undefined,
        ...(breadcrumbs && { breadcrumbs }),
        pathMap,
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
        return getContent(`/redirects/${shortUrlPath}`, branch);
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
        return runWithTimeTravelHooks(time, branch, contentId, () => {
            const content = getContent(contentId, branch);
            if (!content) {
                return null;
            }

            return { ...content, livePath: contentRaw._path };
        });
    } catch (e) {
        log.warning(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

const getSiteContent = (requestedPathOrId, branch = 'master', time, nocache, retry = true) => {
    const contentRef = getInternalContentPathFromCustomPath(requestedPathOrId) || requestedPathOrId;

    if (time && timeTravelEnabled) {
        return getContentVersionFromTime(contentRef, branch, time);
    }

    const content = nocache
        ? getContent(contentRef, branch)
        : cache.getSitecontent(contentRef, branch, () => getContent(contentRef, branch));

    if (!content) {
        return nocache
            ? getRedirectContent(contentRef, branch)
            : cache.getSitecontent(contentRef, branch, () =>
                  getRedirectContent(contentRef, branch)
              );
    }

    // Peace-of-mind checks to see if hooks for time-specific content retrieval is
    // causing unexpected side-effects. Can be removed once peace of mind has been
    // attained :D
    if (timeTravelEnabled) {
        const contentRaw = runInBranchContext(
            () => contentLibGetOriginal({ key: contentRef }),
            branch
        );

        const rawTime = contentRaw?.modifiedTime || contentRaw?.createdTime;
        const guillotineTime = content?.modifiedTime || content?.createdTime;
        log.info(`Checking modifiedTime for ${contentRef} - ${rawTime} ${guillotineTime}`);

        const rawTimestamp = getUnixTimeFromDateTimeString(rawTime);
        const guillotineTimestamp = getUnixTimeFromDateTimeString(guillotineTime);

        if (rawTimestamp !== guillotineTimestamp) {
            // In the (hopefully impossible!) event that time travel functionality is causing
            // normal requests to retrieve outdated data, retry the request
            if (retry) {
                log.error(
                    `Time travel: bad response for content ${contentRef} - got timestamp: ${guillotineTimestamp} - should be: ${rawTimestamp}${
                        retry ? ' - retrying one more time' : ''
                    }`
                );
                return getSiteContent(requestedPathOrId, branch, time, nocache, false);
            }

            // if retry didn't help, disable time travel functionality
            unhookTimeTravel();
            timeTravelEnabled = false;
            log.error(`Time travel permanently disabled on this node`);
            return null;
        }
    }

    // If the content has a custom path, we want to redirect requests from the internal path
    if (shouldRedirectToCustomPath(content, requestedPathOrId, branch)) {
        return {
            __typename: 'no_nav_navno_InternalLink',
            data: { target: { _path: content.data.customPath } },
        };
    }

    if (isMedia(content)) {
        return content;
    }

    const notifications = getNotifications(content._path);

    return { ...content, ...(notifications && { notifications }) };
};

module.exports = { getSiteContent, getContent, getRedirectContent };
