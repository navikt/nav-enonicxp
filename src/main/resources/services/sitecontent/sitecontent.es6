const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const globalFragment = require('./fragments/_global.es6');
const componentsFragment = require('./fragments/_components.es6');
const sectionPageFragment = require('./fragments/sectionPage.es6');
const contentListFragment = require('./fragments/contentList.es6');
const internalLinkFragment = require('./fragments/internalLink.es6');
const notificationsFragment = require('./fragments/notification.es6');
const transportPageFragment = require('./fragments/transportPage.es6');
const externalLinkFragment = require('./fragments/externalLink.es6');
const pageListFragment = require('./fragments/pageList.es6');
const mainArticleFragment = require('./fragments/mainArticle.es6');

const schema = guillotineLib.createSchema();

const queryFields = [
    globalFragment,
    componentsFragment,
    contentListFragment,
    externalLinkFragment,
    internalLinkFragment,
    mainArticleFragment,
    notificationsFragment,
    pageListFragment,
    sectionPageFragment,
    transportPageFragment,
].join('\n');

const queryGetId = `query($path:ID!){
    guillotine {
        get(key:$path) {
            ${queryFields}
            ...on base_Folder {
                children {
                    ${queryFields}
                }
            }
        }
    }
}`;

const deepSearchAndAppendJson = (obj, searchFor, appendTo) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map((item) => deepSearchAndAppendJson(item, searchFor, appendTo));
        }

        const newObj = {};
        Object.keys(obj).forEach((key) => {
            if (key === searchFor) {
                newObj[appendTo] = { ...JSON.parse(obj[searchFor]), ...newObj[appendTo] };
            } else if (key === appendTo) {
                newObj[appendTo] = {
                    ...newObj[appendTo],
                    ...deepSearchAndAppendJson(obj[appendTo], searchFor, appendTo),
                };
            } else {
                newObj[key] = deepSearchAndAppendJson(obj[key], searchFor, appendTo);
            }
        });
        return newObj;
    }
    return obj;
};

const getContent = (contentId) => {
    const queryResponse = graphQlLib.execute(schema, queryGetId, {
        path: contentId,
    });

    const { data, errors } = queryResponse;

    if (errors) {
        log.info('GraphQL errors:');
        errors.forEach((error) => log.info(error.message));
        return null;
    }

    const content = data.guillotine?.get;
    if (!content) {
        log.info(`Content not found: ${contentId}`);
        return null;
    }

    const withPageAndDataJson = deepSearchAndAppendJson(
        deepSearchAndAppendJson(content, 'dataAsJson', 'data'),
        'pageAsJson',
        'page'
    );

    return withPageAndDataJson;
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
