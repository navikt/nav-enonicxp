const portal = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');

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

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const fetchContentAndParse = (id, url) => {
    const res = httpClient.request({
        url: url,
        method: 'POST',
        body: JSON.stringify({
            query: queryGetId,
            variables: {
                path: id,
            },
        }),
        contentType: 'application/json',
    });

    const dataParsed = JSON.parse(res.body)?.data?.guillotine?.get;
    if (!dataParsed) {
        return null;
    }

    return {
        ...dataParsed,
        dataAsJson: undefined,
        data: dataParsed.dataAsJson ? JSON.parse(dataParsed.dataAsJson) : undefined,
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

    const graphqlServiceUrl = portal.serviceUrl({
        service: 'graphql',
        application: 'com.enonic.app.guillotine',
        type: 'absolute',
    });

    const contentParsed = fetchContentAndParse(id, graphqlServiceUrl);

    return contentParsed
        ? {
              status: 200,
              body: contentParsed,
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

    if (!ids || ids?.length === 0) {
        return {
            status: 400,
            body: {
                message: 'No content ids were provided',
            },
            contentType: 'application/json',
        };
    }

    const graphqlServiceUrl = portal.serviceUrl({
        service: 'graphql',
        application: 'com.enonic.app.guillotine',
        type: 'absolute',
    });

    // TODO: flere sorteringsmuligheter?
    const sortFunc = sorted
        ? (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a)
        : () => {};

    const contentParsedArray = ids
        ?.map((id) => fetchContentAndParse(id, graphqlServiceUrl))
        .filter(Boolean)
        .sort(sortFunc)
        .slice(0, numItems || undefined);

    return {
        status: 200,
        body: contentParsedArray,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
exports.post = handlePost;
