import contentLib, { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';

const getChatContactInformation = (
    contactContentId?: string,
    lang?: string
): Content<'no.nav.navno:contact-information'> | null => {
    const queryString = contactContentId
        ? `_id = '${contactContentId}'`
        : `data.contactType._selected = 'chat' AND language = '${lang || 'no'}'`;

    const queryResults = contentLib.query({
        query: queryString,
        start: 0,
        count: 1,
    }).hits;

    if (queryResults.length === 0) {
        return null;
    }

    return queryResults[0] as Content<'no.nav.navno:contact-information'>;
};

export const contactInformationChatCallback: CreationCallback = (context, params) => {
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
