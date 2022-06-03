import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { PayoutDates } from '../../../../site/content-types/payout-dates/payout-dates';
import { forceArray } from '../../../utils/nav-utils';

type Note = Required<PayoutDates>['notes'][number];

export const payoutDatesDataCallback: CreationCallback = (context, params) => {
    params.fields.notes.args = {
        contentId: graphQlLib.GraphQLID,
    };

    params.fields.notes.type = graphQlLib.list(graphQlLib.reference('RichText'));

    params.fields.notes.resolve = (env) => {
        if (!env.source.notes) {
            return [];
        }

        const content = contentLib.get({ key: env.args.contentId });
        if (!content) {
            return [];
        }

        const notesForLocale = forceArray(env.source.notes).reduce((acc, note: Note) => {
            if (note.locale !== content.language) {
                return acc;
            }

            const processedHtml = macroLib.processHtml({
                type: 'server',
                value: note.html,
            });

            return [...acc, processedHtml];
        }, []);

        return notesForLocale;
    };
};
