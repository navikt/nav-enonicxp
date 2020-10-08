const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const globalFragment = require('./fragments/_global.es6');
const componentsFragment = require('./fragments/_components.es6');
const sectionPageFragment = require('./fragments/sectionPage.es6');
const contentListFragment = require('./fragments/contentList.es6');
const internalLinkFragment = require('./fragments/internalLink.es6');
const notificationsFragment = require('./fragments/notification.es6');
const transportPage = require('./fragments/transportPage.es6');
const externalLinkFragment = require('./fragments/externalLink.es6');
const pageList = require('./fragments/pageList.es6');
const mainArticle = require('./fragments/mainArticle.es6');
const filterContent = require('./utils/content-filtering.es6');
const deepSearchParseJsonAndAppend = require('./utils/deep-json-parser.es6');
const largeTable = require('./fragments/largeTable.es6');

const schema = guillotineLib.createSchema();

const queryFields = [
    globalFragment,
    componentsFragment,
    contentListFragment,
    externalLinkFragment,
    internalLinkFragment,
    mainArticle.fragment,
    notificationsFragment,
    pageList.fragment,
    sectionPageFragment,
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

    const filteredContent = filterContent(contentWithParsedJsonData);

    return filteredContent;
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
