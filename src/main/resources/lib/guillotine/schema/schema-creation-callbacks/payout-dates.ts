import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const payoutDatesDataCallback: CreationCallback = (context, params) => {
    params.fields.notes.args = {
        contentId: graphQlLib.GraphQLID,
    };

    params.fields.notes.type = graphQlLib.reference('RichText');

    params.fields.notes.resolve = (env) => {
        const { notes } = env.source;

        if (!notes) {
            return [];
        }

        const content = contentLib.get({ key: env.args.contentId });
        if (!content?.language) {
            return [];
        }

        const selectedLocale = notes[content.language] || notes['no'] || notes['nn'] || notes['en'];

        return macroLib.processHtml({
            type: 'server',
            value: selectedLocale.html,
        });
    };
};
