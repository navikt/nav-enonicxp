import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';

import { CreationCallback } from '../../utils/creation-callback-utils';

export const productDetailsCallback: CreationCallback = (context, params) => {
    params.fields.processing_times = {
        type: graphQlLib.reference('no_nav_navno_ProductDetails'),
        resolve: (env) => {
            return env.source.processing_times
                ? contentLib.get({ key: env.source.processing_times })
                : null;
        },
    };
    params.fields.payout_dates = {
        type: graphQlLib.reference('no_nav_navno_ProductDetails'),
        resolve: (env) => {
            return env.source.payout_dates
                ? contentLib.get({ key: env.source.payout_dates })
                : null;
        },
    };
    params.fields.rates = {
        type: graphQlLib.reference('no_nav_navno_ProductDetails'),
        resolve: (env) => {
            return env.source.rates ? contentLib.get({ key: env.source.rates }) : null;
        },
    };
};
