const portal = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');

const query = `query($path:ID!){
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

const handleGet = (req) => {
    const id = req.params.id;

    if (!id) {
        return {
            status: 400,
            body: {
                message: "No content path or id was provided",
            },
            contentType: 'application/json',
        }
    }

    const graphqlServiceUrl = portal.serviceUrl({
        service: 'graphql',
        application: 'com.enonic.app.guillotine',
        type: "absolute"
    });

    const res = httpClient.request({
        url: graphqlServiceUrl,
        method: 'POST',
        body: JSON.stringify({
            query: query,
            variables: {
                'path': id
            }
        }),
        contentType: 'application/json',
    })

    const dataParsed = JSON.parse(res.body)?.data?.guillotine?.get;
    if (!dataParsed) {
        return {
            status: 404,
            body: {
                message: "Site path not found",
            },
            contentType: 'application/json',
        }
    }

    const dataToClient = {
        ...dataParsed,
        dataAsJson: undefined,
        data: dataParsed.dataAsJson ? JSON.parse(dataParsed.dataAsJson) : undefined
    }

    return {
        status: 200,
        body: dataToClient,
        contentType: 'application/json',
    }
}

exports.get = handleGet;
