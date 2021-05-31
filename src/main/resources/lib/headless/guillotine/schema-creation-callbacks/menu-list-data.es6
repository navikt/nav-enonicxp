const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql.js');
const { forceArray } = require('/lib/nav-utils');
const { sanitizeText } = require('/lib/guillotine/util/naming');

const menuListDataCallback = (context, params) => {
    // Create new types for mapped values
    const menuListLink = graphQlLib.createObjectType(context, {
        name: context.uniqueName('MenuListLink'),
        description: 'Lenke i MenuListItem',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            text: { type: graphQlLib.GraphQLString },
        },
    });

    const menuListItem = graphQlLib.createObjectType(context, {
        name: context.uniqueName('MenuListItem'),
        description: 'Lenker i høyremeny',
        fields: {
            links: {
                type: graphQlLib.list(menuListLink),
            },
        },
    });

    // Create new types for mapped values
    Object.keys(params.fields).forEach((key) => {
        if (key !== '_selected') {
            const sanitizedKey = sanitizeText(key);
            params.fields[sanitizedKey] = {
                resolve: resolve(sanitizedKey),
                type: menuListItem,
            };
        }
    });
};

const resolve = (menuListKey) => (env) => {
    // Fix mismatch between source key and graphQL key
    const realKey = Object.keys(env.source).find((el) => sanitizeText(el) === menuListKey);

    const link = forceArray(env.source[realKey]?.link);
    const files = forceArray(env.source[realKey]?.files);
    const contentResolved = getContentFromRefs([...link, ...files]);
    return { links: contentResolved };
};

const getContentFromRefs = (refs) => {
    if (refs.length === 0) {
        return null;
    }

    return refs.reduce((acc, ref) => {
        const content = contentLib.get({ key: ref });
        if (!content) {
            return acc;
        }

        return [
            ...acc,
            {
                text: content.displayName,
                url: content._path,
            },
        ];
    }, []);
};

module.exports = { menuListDataCallback };
