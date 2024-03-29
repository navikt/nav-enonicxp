import * as contentLib from '/lib/xp/content';
import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { sanitizeText } from '/lib/guillotine/util/naming';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/array-utils';

type MenuListData = {
    text: string;
    url: string;
};

export const menuListDataCallback: CreationCallback = (context, params) => {
    if (!context.types.menuListItemType) {
        context.types.menuListLinkType = graphQlCreateObjectType(context, {
            name: 'MenuListLink',
            description: 'Lenke i MenuListItem',
            fields: {
                url: { type: graphQlLib.GraphQLString },
                text: { type: graphQlLib.GraphQLString },
            },
        });
    }

    if (!context.types.menuListItemType) {
        context.types.menuListItemType = graphQlCreateObjectType(context, {
            name: 'MenuListItem',
            description: 'Lenker i høyremeny',
            fields: {
                links: {
                    type: graphQlLib.list(context.types.menuListLinkType),
                },
            },
        });
    }

    // Create new types for mapped values
    Object.keys(params.fields).forEach((key) => {
        if (key !== '_selected') {
            const sanitizedKey = sanitizeText(key);
            params.fields[sanitizedKey] = {
                resolve: resolve(sanitizedKey),
                type: context.types.menuListItemType,
            };
        }
    });
};

const resolve =
    (menuListKey: string): GraphQLResolver['resolve'] =>
    (env) => {
        // Fix mismatch between source key and graphQL key
        const realKey = Object.keys(env.source).find((el) => sanitizeText(el) === menuListKey);

        if (!realKey) {
            return { links: null };
        }

        const link = forceArray(env.source[realKey]?.link);
        const files = forceArray(env.source[realKey]?.files);
        const contentResolved = getContentFromRefs([...link, ...files]);
        return { links: contentResolved };
    };

const getContentFromRefs = (refs: string[]) => {
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
    }, [] as MenuListData[]);
};
