const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const filterContent = require('/lib/headless-utils/content-filtering');
const deepSearchParseJsonAndAppend = require('/lib/headless-utils/deep-json-parser');

const globalFragment = require('./fragments/_global');
const componentsFragment = require('./fragments/_components');
const sectionPage = require('./fragments/sectionPage');
const contentList = require('./fragments/contentList');
const internalLink = require('./fragments/internalLink');
const transportPage = require('./fragments/transportPage');
const externalLink = require('./fragments/externalLink');
const pageList = require('./fragments/pageList');
const mainArticle = require('./fragments/mainArticle');
const largeTable = require('./fragments/largeTable');
const searchForRedirect = require('../../site/error/error.es6');

const schema = guillotineLib.createSchema();

const queryFields = [
    globalFragment,
    componentsFragment,
    contentList.fragment,
    externalLink.fragment,
    internalLink.fragment,
    mainArticle.fragment,
    pageList.fragment,
    sectionPage.fragment,
    transportPage.fragment,
    largeTable.fragment,
].join('\n');

const queryGetContentByRef = `query($ref:ID!){
    guillotine {
        get(key:$ref) {
            ${queryFields}
            pageAsJson
            pageTemplate {
                pageAsJson
                ${componentsFragment}
            }
            ...on base_Folder {
                children {
                    ${queryFields}
                }
            }
        }
    }
}`;

const getContent = (contentId) => {
    const queryResponse = graphQlLib.execute(schema, queryGetContentByRef, {
        ref: contentId,
    });

    const { data, errors } = queryResponse;

    if (errors) {
        log.info('GraphQL errors:');
        errors.forEach((error) => log.info(error.message));
    }

    const content = data?.guillotine?.get;
    if (!content) {
        log.info(`Content not found: ${contentId}`);
        return null;
    }

    const contentWithParsedJsonData = deepSearchParseJsonAndAppend(
        deepSearchParseJsonAndAppend(content, 'dataAsJson', 'data'),
        'pageAsJson',
        'page'
    );

    return filterContent(contentWithParsedJsonData);
};

const getRedirectTargetFromContent = (content) => {
    if (content.type === 'no.nav.navno:internal-link') {
        return content.data.target;
    }
    if (content.type === 'no.nav.navno:external-link') {
        return content.data.url;
    }
    return null;
};

const getRedirectContent = (contentId, branch = 'master') => {
    const redirectContent = searchForRedirect(contentId, { branch });
    const targetId = getRedirectTargetFromContent(redirectContent);
    if (targetId) {
        return getContent(targetId);
    }
    return null;
};

const handleGet = (req) => {
    const { id } = req.params;

    if (!id) {
        return {
            status: 400,
            body: {
                message: 'No content id was provided',
            },
            contentType: 'application/json',
        };
    }

    const content = getContent(id, true);

    if (!content) {
        const redirectContent = getRedirectContent(id, req.branch);
        if (redirectContent) {
            return {
                status: 200,
                body: redirectContent,
                contentType: 'application/json',
            };
        }
    }

    return content
        ? {
              status: 200,
              body: content,
              contentType: 'application/json',
          }
        : {
              status: 404,
              body: {
                  message: 'Site path not found',
              },
              contentType: 'application/json',
          };
};

exports.get = handleGet;
