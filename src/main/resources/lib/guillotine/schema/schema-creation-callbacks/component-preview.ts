import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const componentPreviewCallback: CreationCallback = (context, params) => {
    params.fields.component = {
        type: graphQlLib.reference('Content'),
        resolve: (env) => {
            const { target, disabled } = env.source;
            if (!target) {
                return null;
            }

            // We don't need to resolve disabled situation cards from master
            // as they will not be included in the response anyway
            if (disabled && contextLib.get().branch === 'master') {
                return null;
            }

            return contentLib.get({ key: target });
        },
    };
};
