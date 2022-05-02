import { Context } from '/lib/guillotine';
import graphQlLib from '/lib/graphql';
import { graphQlCreateObjectType } from '../utils/creation-callback-utils';

// Create new types for MenuListItems
const createMenuListTypes = (context: Context) => {
    const menuListLink = graphQlCreateObjectType(context, {
        name: 'MenuListLink',
        description: 'Lenke i MenuListItem',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            text: { type: graphQlLib.GraphQLString },
        },
    });

    graphQlCreateObjectType(context, {
        name: 'MenuListItem',
        description: 'Lenker i høyremeny',
        fields: {
            links: {
                type: graphQlLib.list(menuListLink),
            },
        },
    });
};

export const createSchemaTypes = (context: Context) => {
    createMenuListTypes(context);
};
