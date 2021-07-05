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
const { contentLibTimeTravel } = require('/lib/content-lib-time-travel/content-lib-time-travel');

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
const { getNotificationsNoCache } = require('/lib/headless/guillotine/queries/notifications');

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
    const contentRaw = contentLib.get({ key: contentRef });

    return contentLibTimeTravel(time, branch, contentRef, () => {
        const content = getContent(contentRef, branch);
        if (!content) {
            return null;
        }

        return { ...content, livePath: contentRaw._path };
    });
};

const getSiteContent = (requestedPathOrId, branch = 'master', time) => {
    const contentRef = getInternalContentPathFromCustomPath(requestedPathOrId) || requestedPathOrId;
    if (time) {
        return getContentVersionFromTime(contentRef, branch, time);
    }

    // Get the content from cache if it exists
    // We always want to use the actual XP content ref as cache key, to keep the cache
    // consistent even if the custom path of a content is changed
    const content = cache.getSitecontent(
        contentRef,
        branch,
        () => getContent(contentRef, branch) || getRedirectContent(contentRef, branch)
    );

    if (!content) {
        return null;
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
