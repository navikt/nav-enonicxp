const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');
const deepJsonParser = require('/lib/headless/deep-json-parser');
const { mergeComponentsIntoPage } = require('/lib/headless/process-components');
const { getPortalFragmentContent } = require('/lib/headless/process-components');
const { runInBranchContext } = require('/lib/headless/branch-context');
const menuUtils = require('/lib/menu-utils');
const cache = require('/lib/siteCache');
const { getNotifications } = require('/lib/headless/guillotine/queries/notifications');
const contentLib = require('/lib/xp/content');

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
const media = require('./fragments/media');

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
    media.mediaAttachmentFragment,
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

const getInternalPathFromPublicPath = (path) => {
    const content = runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 2,
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'data.publicPath',
                                values: [path],
                            },
                        },
                    },
                },
            }).hits,
        'master'
    );

    if (content.length === 0) {
        return path;
    }

    if (content.length > 1) {
        log.error(`Public path ${path} exists on multiple content objects!`);
        return path;
    }

    return content[0]._path;
};

const getContent = (idOrPath, branch) => {
    const internalPath = getInternalPathFromPublicPath(idOrPath);

    const response = guillotineQuery(
        queryGetContentByRef,
        {
            ref: internalPath,
        },
        branch
    )?.get;

    const content = response && internalPath ? { ...response, _path: internalPath } : response;
    if (!content) {
        return null;
    }

    if (
        branch !== 'draft' &&
        content.data?.publicPath &&
        content.data.publicPath !== content._path
    ) {
        return {
            __typename: 'no_nav_navno_InternalLink',
            data: { target: { _path: content.data?.publicPath } },
        };
    }

    if (isMedia(content)) {
        return content;
    }

    const contentWithParsedData = deepJsonParser(content, ['data', 'config', 'page']);

    if (content.__typename === 'portal_Fragment') {
        return getPortalFragmentContent(contentWithParsedData);
    }

    const page = mergeComponentsIntoPage(contentWithParsedData);
    const breadcrumbs = runInBranchContext(() => menuUtils.getBreadcrumbMenu(internalPath), branch);

    return {
        ...contentWithParsedData,
        page,
        components: undefined,
        ...(breadcrumbs && { breadcrumbs }),
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
        const shortUrlTarget = runInBranchContext(
            () => contentLib.get({ key: `/redirects/${shortUrlPath}` }),
            branch
        );

        if (!shortUrlTarget) {
            return null;
        }

        if (shortUrlTarget.type === 'no.nav.navno:internal-link') {
            const target = shortUrlTarget.data?.target;
            if (!target) {
                return null;
            }

            const targetContent = getContent(target, branch);
            if (!targetContent) {
                return null;
            }

            return {
                ...shortUrlTarget,
                __typename: 'no_nav_navno_InternalLink',
                data: { target: { _path: targetContent._path } },
            };
        }

        if (shortUrlTarget.type === 'no.nav.navno:external-link') {
            return {
                ...shortUrlTarget,
                __typename: 'no_nav_navno_ExternalLink',
            };
        }

        if (shortUrlTarget.type === 'no.nav.navno:url') {
            return {
                ...shortUrlTarget,
                __typename: 'no_nav_navno_Url',
            };
        }
    }

    return null;
};

const getSiteContent = (idOrPath, branch = 'master') => {
    const content = cache.getSitecontent(
        idOrPath,
        branch,
        () => getContent(idOrPath, branch) || getRedirectContent(idOrPath, branch)
    );

    if (!content) {
        return null;
    }

    if (isMedia(content)) {
        return content;
    }

    const notifications = getNotifications(content._path);

    return { ...content, ...(notifications && { notifications }) };
};

module.exports = { getSiteContent, getContent };
