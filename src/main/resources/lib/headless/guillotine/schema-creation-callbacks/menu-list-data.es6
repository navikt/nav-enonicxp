const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql.js');
const { generateCamelCase } = require('/lib/guillotine/util/naming');

const menuListItemMapper = (ref) => {
    const content = contentLib.get({ key: ref });
    const attachments = contentLib.getAttachments({ key: ref });
    log.info(JSON.stringify(attachments));
    return {
        url: content._path,
        text: content.displayName,
    };
};

const menuListItemsGetContent = (refs) => {
    if (Array.isArray(refs)) {
        return refs.map((key) => menuListItemMapper(key));
    }
    return [menuListItemMapper(refs)];
};

const menuListItemsResolver = (menuListKey) => (env) => {
    const key = Object.keys(env.source).filter(
        (item) => generateCamelCase(item) === menuListKey
    )[0];
    const link = env.source[key]?.link;
    const files = env.source[key]?.files;
    const linksResolved = link ? menuListItemsGetContent(link) : [];
    const filesResolved = files ? menuListItemsGetContent(files) : [];
    return { links: [...linksResolved, ...filesResolved] };
};

const menuListItemsCallback = (context, params) => {
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

    Object.keys(params.fields).forEach((key) => {
        if (key !== '_selected') {
            params.fields[key] = {
                resolve: menuListItemsResolver(key),
                type: context.types.menuListItem,
            };
        }
    });
};

module.exports = menuListItemsCallback;
