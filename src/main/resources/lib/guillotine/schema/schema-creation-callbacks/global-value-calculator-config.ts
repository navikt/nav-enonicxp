import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import {
    getGlobalNumberValue,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../global-values/global-value-utils';
import { runInContext } from '../../../context/run-in-context';
import { logger } from '../../../utils/logging';

export const globalValueCalculatorConfigCallback: CreationCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            if (!env.source.key) {
                return null;
            }

            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            if (!gvKey || !contentId) {
                logger.error(
                    `Invalid global value reference in calculator: ${env.source.key} (code 1)`,
                    true,
                    true
                );
                return null;
            }

            const value = runInContext({ branch: 'master' }, () =>
                getGlobalNumberValue(gvKey, contentId)
            );
            if (value === null) {
                logger.error(
                    `Invalid global value reference in calculator: ${env.source.key} (code 2)`,
                    true,
                    true
                );
            }

            return value;
        },
    };
};
