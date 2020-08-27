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

const getLastUpdatedUnixTime = (content) =>
    new Date(content.modifiedTime.split('.')[0] || content.createdTime.split('.')[0]).getTime();

const getContent = (id) => {
    const queryResponse = graphQlLib.execute(schema, queryGetId, {
        path: id,
    });

    const content = queryResponse?.data?.guillotine?.get;
    if (!content) {
        return null;
    }

    return {
        ...content,
        dataAsJson: undefined,
        data: content.dataAsJson ? JSON.parse(content.dataAsJson) : undefined,
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

    const content = getContent(id);

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

    // TODO: flere sorteringsmuligheter?
    const sortFunc = sorted
        ? (a, b) => getLastUpdatedUnixTime(b) - getLastUpdatedUnixTime(a)
        : () => {};

    const contentArray = ids
        ?.map((id) => getContent(id))
        .filter(Boolean)
        .sort(sortFunc)
        .slice(0, numItems || undefined);

    return {
        status: 200,
        body: contentArray,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
exports.post = handlePost;
