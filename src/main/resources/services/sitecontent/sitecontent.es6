const { isValidBranch } = require('/lib/headless/run-in-context');
const { runInBranchContext } = require('/lib/headless/run-in-context');
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

const getContent = (idOrPath, branch = 'master') => {
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

    return {
        ...contentWithParsedData,
        page,
        components: undefined,
    };
};

const getRedirectContent = (idOrPath, branch = 'master') => {
    const pathSegments = idOrPath.split('/');
    const redirect = pathSegments.length === 3 && pathSegments[2];

    if (redirect) {
        const redirectContent = runInBranchContext(
            () => contentLib.get({ key: `/redirects/${redirect}` }),
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
                data: { target: { _path: target._path } },
                __typename: 'no_nav_navno_InternalLink',
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
const { getSiteContent } = require('/lib/headless/guillotine/queries/sitecontent');

const handleGet = (req) => {
    // id can be a content UUID, or a content path, ie. /www.nav.no/no/person
    const { id: idOrPath, branch } = req.params;
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Invalid secret',
            },
            contentType: 'application/json',
        };
    }

    if (!idOrPath) {
        return {
            status: 400,
            body: {
                message: 'No content id or path was provided',
            },
            contentType: 'application/json',
        };
    }

    if (branch && !isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: 'Invalid branch specified',
            },
            contentType: 'application/json',
        };
    }

    const content = getSiteContent(idOrPath, branch);

    if (!content) {
        log.info(`Content not found: ${idOrPath}`);
        return {
            status: 404,
            body: {
                message: 'Site path not found',
            },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: content,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
