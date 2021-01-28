const contentLib = require('/lib/xp/content');
const portalLib = require('/lib/xp/portal');
const contextLib = require('/lib/xp/context');
const graphQlLib = require('/lib/guillotine/graphql.js');
const utils = require('/lib/nav-utils');
const { generateCamelCase } = require('/lib/guillotine/util/naming');

const callback = (context, params) => {
    // Create new types for mapped values
    if (!context.types.menuListLink) {
        context.types.menuListLink = graphQlLib.createObjectType(context, {
            name: context.uniqueName('MenuListLink'),
            description: 'Lenke i MenuListItem',
            fields: {
                url: { type: graphQlLib.GraphQLString },
                text: { type: graphQlLib.GraphQLString },
            },
        });
    }

    if (!context.types.menuListItem) {
        context.types.menuListItem = graphQlLib.createObjectType(context, {
            name: context.uniqueName('MenuListItem'),
            description: 'Lenker i høyremeny',
            fields: {
                links: {
                    type: graphQlLib.list(context.types.menuListLink),
                },
            },
        });
    }

    // Create new types for mapped values
    Object.keys(params.fields).forEach((key) => {
        if (key !== '_selected') {
            params.fields[key] = {
                resolve: resolve(key),
                type: context.types.menuListItem,
            };
        }
    });
};

const resolve = (menuListKey) => (env) => {
    // Fix mismatch between source key and graphQL key
    const realKey = Object.keys(env.source).find((el) => generateCamelCase(el) === menuListKey);

    const link = env.source[realKey]?.link;
    const files = env.source[realKey]?.files;
    const linksResolved = link ? getContentFromRefs(link) : [];
    const filesResolved = files ? getContentFromRefs(files) : [];
    return { links: [...linksResolved, ...filesResolved] };
};

const getContentFromRefs = (refs) => {
    // Refs can be arrays and strings
    return utils
        .forceArray(refs)
        .map((key) => getContentFromRef(key))
        .filter(Boolean);
};

const getContentFromRef = (ref) => {
    const content = contentLib.get({ key: ref });
    if (!content) {
        return null;
    }
    const path = content._path;
    const text = content.displayName;
    const type = content.type;
    return { text, url: type.startsWith('media:') ? getAttachmentUrl(ref) : path };
};

const getAttachmentUrl = (ref) => {
    const context = contextLib.get();

    if (context.branch === 'draft') {
        return portalLib
            .attachmentUrl({
                id: ref,
                type: 'server',
                download: true,
            })
            ?.replace(/\/_\//, '/admin/site/preview/default/draft/_/');
    }

    return portalLib.attachmentUrl({
        id: ref,
        type: 'absolute',
        download: true,
    });
};

module.exports = callback;
