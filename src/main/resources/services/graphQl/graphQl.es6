const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');

const schema = guillotineLib.createSchema();

const secret = 'asdf';

const graphQl = (req) => {
    if (!req.body) {
        return {
            status: 400,
            body: { message: 'Missing parameters' },
            contentType: 'application/json',
        };
    }

    const { query, token } = JSON.parse(req.body);

    if (token !== secret) {
        return {
            status: 403,
            body: { message: 'Not authorized' },
            contentType: 'application/json',
        };
    }

    const { data, errors } = graphQlLib.execute(schema, query);

    if (errors) {
        return {
            status: 400,
            body: { message: errors[0].message },
            contentType: 'application/json',
        };
    }

    if (!data) {
        return {
            status: 500,
            body: { message: 'GraphQL not responding' },
            contentType: 'application/json',
        };
    }

    const content = data.guillotine?.get;

    if (!content) {
        return {
            status: 404,
            body: { message: 'Not found' },
            contentType: 'application/json',
        };
    }

    return {
        body: JSON.stringify(content),
        contentType: 'application/json',
    };
};

exports.post = graphQl;
