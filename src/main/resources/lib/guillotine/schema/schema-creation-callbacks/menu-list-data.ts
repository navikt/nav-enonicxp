import contentLib from '/lib/xp/content';
import graphQlLib, { GraphQLResolverCallback } from '/lib/graphql';
import { sanitizeText } from '/lib/guillotine/util/naming';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';

type MenuListData = {
    text: string;
    url: string;
};

export const menuListDataCallback: CreationCallback = (context, params) => {
    // Create new types for mapped values
    Object.keys(params.fields).forEach((key) => {
        if (key !== '_selected') {
            const sanitizedKey = sanitizeText(key);
            params.fields[sanitizedKey] = {
                resolve: resolve(sanitizedKey),
                type: graphQlLib.reference('MenuListItem'),
            };
        }
    });
};

const resolve =
    (menuListKey: string): GraphQLResolverCallback<any, any> =>
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
