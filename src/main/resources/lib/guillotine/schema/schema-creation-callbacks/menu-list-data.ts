import * as contentLib from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { FieldResolver, SchemaExtension } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/array-utils';

type MenuListData = {
    text: string;
    url: string;
};

const MENU_LIST_LINK_TYPE = 'MenuListLink';
const MENU_LIST_ITEM_TYPE = 'MenuListItem';

// Field name sanitizer from lib-guillotine, which is used to generate GraphQL field names from
// the option names in the menu-list-items form fragment
const sanitizeText = (text: string) => {
    let sanitizedText = '';

    for (let i = 0; i < text.length; i++) {
        const originalChar = text.charAt(i);

        if (originalChar === '_' || originalChar === '-' || originalChar === '.') {
            sanitizedText += originalChar;
        } else if (originalChar === '+' || originalChar === ' ') {
            sanitizedText += '-';
        } else {
            const sanitizedChars = sanitize(originalChar);

            if (sanitizedChars !== 'page') {
                if (originalChar === originalChar.toUpperCase()) {
                    sanitizedText += sanitizedChars.toUpperCase();
                } else {
                    sanitizedText += sanitizedChars;
                }
            }
        }
    }

    if (sanitizedText.length > 0 && /[0-9]/.test(sanitizedText.charAt(0))) {
        sanitizedText = '_' + sanitizedText;
    }

    return sanitizedText.replace(/([^0-9A-Za-z])+/g, '_');
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

const resolveMenuListItem =
    (menuListKey: string): FieldResolver =>
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

// The Guillotine app does not expose existing fields to schema extensions, so the menu list
// field names must be provided. These are the sanitized option names from the menuListItems
// option set of the content type.
export const menuListDataCallback =
    (fieldNames: string[]): SchemaExtension =>
    (graphQL, typeName) => ({
        types: {
            [MENU_LIST_LINK_TYPE]: {
                description: 'Lenke i MenuListItem',
                fields: {
                    url: { type: graphQL.GraphQLString },
                    text: { type: graphQL.GraphQLString },
                },
            },
            [MENU_LIST_ITEM_TYPE]: {
                description: 'Lenker i høyremeny',
                fields: {
                    links: { type: graphQL.list(graphQL.reference(MENU_LIST_LINK_TYPE)) },
                },
            },
        },
        creationCallbacks: {
            [typeName]: (params) => {
                params.addFields(
                    fieldNames.reduce(
                        (acc, fieldName) => ({
                            ...acc,
                            [fieldName]: { type: graphQL.reference(MENU_LIST_ITEM_TYPE) },
                        }),
                        {}
                    )
                );
            },
        },
        resolvers: {
            [typeName]: fieldNames.reduce<Record<string, FieldResolver>>(
                (acc, fieldName) => ({ ...acc, [fieldName]: resolveMenuListItem(fieldName) }),
                {}
            ),
        },
    });
