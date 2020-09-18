const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const schema = guillotineLib.createSchema();

const queryGetId = `query($path:ID!){
    guillotine {
        get(key:$path) {
            _id
            _path
            createdTime
            modifiedTime
            displayName
            type
            dataAsJson
        }
    }
}`;

const dataContentToFetchByType = {
    'no.nav.navno:section-page': {
        keys: ['tableContents', 'newsContents', 'ntkContents', 'scContents'],
        deepFetch: true,
    },
    'no.nav.navno:content-list': {
        keys: ['sectionContents'],
        deepFetch: false,
    },
};

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const sortByLastModified = (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a);

const getContent = (contentId, deepFetch) => {
    const queryResponse = graphQlLib.execute(schema, queryGetId, {
        path: contentId,
    });

    const content = queryResponse?.data?.guillotine?.get;
    if (!content) {
        return null;
    }

    const data = content.dataAsJson ? JSON.parse(content.dataAsJson) : undefined;

    if (deepFetch && data) {
        const contentToFetch = dataContentToFetchByType[content.type];

        if (contentToFetch) {
            contentToFetch.keys.forEach((key) => {
                const _contentId = data[key];
                if (Array.isArray(_contentId)) {
                    data[key] = _contentId.map((__contentId) =>
                        getContent(__contentId, contentToFetch.deepFetch)
                    );
                } else {
                    data[key] = getContent(_contentId, contentToFetch.deepFetch);
                }
            });
        }
    }

    return {
        ...content,
        dataAsJson: undefined,
        data: data,
    };
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

const handlePost = (req) => {
    const { ids, numItems, sorted } = JSON.parse(req.body);

    if (ids?.length === 0) {
        return {
            status: 400,
            body: {
                message: 'No content ids were provided',
            },
            contentType: 'application/json',
        };
    }

    const contentArray = ids
        .map((id) => getContent(id, true))
        .filter(Boolean)
        .sort(sorted ? sortByLastModified : undefined)
        .slice(0, numItems || undefined);

    return {
        status: 200,
        body: contentArray,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
exports.post = handlePost;
