import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getKeyWithoutMacroDescription } from '../../../utils/component-utils';
import { HtmlAreaPartConfig } from '../../../../site/parts/html-area/html-area-part-config';
import { logger } from '../../../utils/logging';
import { runInContext } from '../../../context/run-in-context';

export const macroFormDetailsCallback: CreationCallback = (context, params) => {
    params.fields.formDetails = {
        type: graphQlLib.reference('no_nav_navno_FormDetails'),
        resolve: (env) => {
            return contentLib.get({ key: env.source.formDetails });
        },
    };
};
