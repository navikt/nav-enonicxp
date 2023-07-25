import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';

import { CreationCallback } from '../../utils/creation-callback-utils';
import { EmptyObject } from 'types/util-types';
import { HtmlAreaPartConfig } from 'site/parts/html-area/html-area-part-config';

const buildProcessObject = (key: string) => {
    return {
        type: graphQlLib.reference('no_nav_navno_ProductDetails'),
        resolve: (env: graphQlLib.GraphQLResolverEnvironment<any, EmptyObject>) => {
            const productDetail = env.source[key] ? contentLib.get({ key: env.source[key] }) : null;
            if (!productDetail) {
                return null;
            }
            const components = productDetail?.page.regions.main.components;
            const processedComponents = components.map((component: any) => {
                if (component.descriptor === 'no.nav.navno:html-area') {
                    const html = (component.config as HtmlAreaPartConfig)?.html;
                    return macroLib.processHtml({
                        type: 'server',
                        value: html,
                    });
                }
            });

            productDetail.page.regions.main.components = processedComponents;

            return productDetail;
        },
    };
};

export const productDetailsCallback: CreationCallback = (context, params) => {
    params.fields.processing_times = buildProcessObject('processing_times');
    params.fields.payout_dates = buildProcessObject('payout_dates');
    params.fields.rates = buildProcessObject('rates');
};
