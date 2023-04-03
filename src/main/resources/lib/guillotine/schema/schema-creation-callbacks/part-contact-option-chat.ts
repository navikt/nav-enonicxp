import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { CONTENT_LOCALE_DEFAULT } from '../../../constants';

const getChatContactInformation = (contactContentId?: string, lang?: string) => {
    const queryResults = contentLib.query({
        count: 1,
        contentTypes: ['no.nav.navno:contact-information'],
        sort: 'createdTime ASC',
        filters: {
            // If no contact info was specified, we will get the oldest
            // matching language version instead
            ...(contactContentId && {
                ids: {
                    values: [contactContentId],
                },
            }),
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.contactType._selected',
                            values: ['chat'],
                        },
                    },
                    {
                        hasValue: {
                            field: 'language',
                            values: [lang || CONTENT_LOCALE_DEFAULT],
                        },
                    },
                ],
            },
        },
    }).hits;

    return queryResults[0] || null;
};

export const partContactOptionChatCallback: CreationCallback = (context, params) => {
    params.fields.sharedContactInformation.args = { contentId: graphQlLib.GraphQLID };
    params.fields.sharedContactInformation.resolve = (env) => {
        const { contentId } = env.args;

        const currentPage = contentLib.get({ key: contentId });
        if (!currentPage) {
            return null;
        }

        const { language } = currentPage;
        const { sharedContactInformation } = env.source;
        const sharedChatContent = getChatContactInformation(sharedContactInformation, language);

        return sharedChatContent;
    };
};
