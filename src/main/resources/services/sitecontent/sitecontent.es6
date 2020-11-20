const guillotineQuery = require('/lib/headless-utils/guillotine-query');
const filterContent = require('/lib/headless-utils/content-filtering');
const deepJsonParser = require('/lib/headless-utils/deep-json-parser');
const componentsArrayToComponentsTree = require('/lib/headless-utils/unflatten-components');
const { isValidBranch } = require('/lib/headless-utils/run-in-context');
const { searchForRedirect } = require('../../site/error/error');

const globalFragment = require('./fragments/_global');
const componentsFragment = require('./fragments/_components');
const sectionPage = require('./fragments/sectionPage');
const contentList = require('./fragments/contentList');
const internalLink = require('./fragments/internalLink');
const transportPage = require('./fragments/transportPage');
const externalLink = require('./fragments/externalLink');
const pageList = require('./fragments/pageList');
const mainArticle = require('./fragments/mainArticle');
const mainArticleChapter = require('./fragments/mainArticleChapter');
const largeTable = require('./fragments/largeTable');

const queryFields = [
    globalFragment,
    componentsFragment,
    contentList.fragment,
    externalLink.fragment,
    internalLink.fragment,
    mainArticle.fragment,
    mainArticleChapter.fragment,
    pageList.fragment,
    sectionPage.fragment,
    transportPage.fragment,
    largeTable.fragment,
].join('\n');

const queryGetContentByRef = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${queryFields}
            ...on base_Folder {
                children {
                    ${queryFields}
                }
            }
        }
    }
}`;

const getContent = (contentId, branch) => {
    const response = guillotineQuery(
        queryGetContentByRef,
        {
            ref: contentId,
        },
        branch
    );

    const content = response?.get;
    if (!content) {
        return null;
    }

    const contentWithParsedJsonData = deepJsonParser(content, ['data', 'config']);

    const filteredContent = filterContent(contentWithParsedJsonData);

    const pageComponentTree = componentsArrayToComponentsTree(filteredContent.components);

    return { ...filteredContent, page: pageComponentTree, components: undefined };
};

const getRedirectContent = (contentPath, branch = 'master') => {
    const redirectContent = searchForRedirect(contentPath, { branch });
    if (!redirectContent) {
        return null;
    }

    if (redirectContent.type === 'no.nav.navno:internal-link') {
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

    if (redirectContent.type === 'no.nav.navno:external-link') {
        return {
            ...redirectContent,
            __typename: 'no_nav_navno_ExternalLink',
        };
    }

    return null;
};

const handleGet = (req) => {
    const { id, branch } = req.params;

    if (!id) {
        return {
            status: 400,
            body: {
                message: 'No content id was provided',
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

    const content = getContent(id, branch) || getRedirectContent(id, branch);

    if (!content) {
        log.info(`Content not found: ${id}`);
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
