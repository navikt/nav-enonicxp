const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const filterContent = require('./utils/content-filtering.es6');
const deepSearchParseJsonAndAppend = require('./utils/deep-json-parser.es6');

const globalFragment = require('./fragments/_global.es6');
const componentsFragment = require('./fragments/_components.es6');
const sectionPage = require('./fragments/sectionPage.es6');
const contentList = require('./fragments/contentList.es6');
const internalLink = require('./fragments/internalLink.es6');
const transportPage = require('./fragments/transportPage.es6');
const externalLink = require('./fragments/externalLink.es6');
const pageList = require('./fragments/pageList.es6');
const mainArticle = require('./fragments/mainArticle.es6');
const largeTable = require('./fragments/largeTable.es6');

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
