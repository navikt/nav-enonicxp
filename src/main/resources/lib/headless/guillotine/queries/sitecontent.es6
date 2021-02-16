const { guillotineQuery } = require('/lib/headless/guillotine/guillotine-query');
const deepJsonParser = require('/lib/headless/deep-json-parser');
const { mergeComponentsIntoPage } = require('/lib/headless/unflatten-components');
const { runInBranchContext } = require('/lib/headless/run-in-context');
const menuUtils = require('/lib/menu-utils');
const cache = require('/lib/siteCache');
const { getNotifications } = require('/lib/headless/guillotine/queries/notifications');
const contentLib = require('/lib/xp/content');
const { sanitize } = require('/lib/xp/common');

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
].join('\n');

const queryGetContentByRef = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${queryFragments}
            pageAsJson(resolveTemplate: true)
            ...on base_Folder {
                children(first:1000) {
                    ${queryFragments}
                }
            }
        }
    }
}`;

const getContent = (idOrPath, branch) => {
    const response = guillotineQuery(
        queryGetContentByRef,
        {
            ref: idOrPath,
        },
        branch
    );

    const content = response?.get;
    if (!content) {
        return null;
    }

    const contentWithParsedData = deepJsonParser(content, ['data', 'config', 'page']);
    const page = mergeComponentsIntoPage(contentWithParsedData);

    const breadcrumbs = runInBranchContext(() => menuUtils.getBreadcrumbMenu(idOrPath), branch);

    return {
        ...contentWithParsedData,
        page,
        components: undefined,
        ...(breadcrumbs && { breadcrumbs }),
    };
};

const getContentFromOldCmsPath = (idOrPath, branch) => {
    const oldCmsKeySearch = /\d+(?=\.cms$)/.exec(idOrPath);
    if (!oldCmsKeySearch) {
        return null;
    }

    const oldCmsKey = oldCmsKeySearch[0];

    log.info(`Found old CMS key: ${oldCmsKey}`);

    const queryRes = runInBranchContext(
        () =>
            contentLib.query({
                query: `x.no-nav-navno.cmsContent.contentKey LIKE "${oldCmsKey}"`,
            }),
        branch
    );

    log.info(`Content found for old CMS key? ${queryRes?.hits?.length > 0}`);

    return queryRes?.hits?.[0];
};

const getRedirectContent = (idOrPath, branch) => {
    const oldCmsPathTarget = getContentFromOldCmsPath(idOrPath, branch);

    if (oldCmsPathTarget) {
        return {
            ...oldCmsPathTarget,
            __typename: 'no_nav_navno_InternalLink',
            data: { target: { _path: oldCmsPathTarget._path } },
        };
    }

    const pathSegments = idOrPath.split('/');
    const shortUrlRedirect = pathSegments.length === 3 && pathSegments[2];

    if (shortUrlRedirect) {
        const redirectContent = runInBranchContext(
            () =>
                contentLib.get({ key: `/redirects/${shortUrlRedirect}` }) ||
                contentLib.get({ key: `/redirects/${sanitize(shortUrlRedirect)}` }),
            branch
        );

        if (!redirectContent) {
            return null;
        }

        if (redirectContent?.type === 'no.nav.navno:internal-link') {
            const target = getContent(redirectContent.data?.target);
            if (!target) {
                return null;
            }

            return {
                ...redirectContent,
                __typename: 'no_nav_navno_InternalLink',
                data: { target: { _path: target._path } },
            };
        }

        if (redirectContent?.type === 'no.nav.navno:external-link') {
            return {
                ...redirectContent,
                __typename: 'no_nav_navno_ExternalLink',
            };
        }

        if (redirectContent?.type === 'no.nav.navno:url') {
            return {
                ...redirectContent,
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

    const notifications = getNotifications(content._path);

    return { ...content, ...(notifications && { notifications }) };
};

module.exports = { getSiteContent };
