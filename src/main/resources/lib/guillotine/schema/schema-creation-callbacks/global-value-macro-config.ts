import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import {
    getGlobalNumberValue,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../global-values/global-value-utils';
import { runInContext } from '../../../context/run-in-context';
import { forceArray } from '../../../utils/nav-utils';
import { logger } from '../../../utils/logging';

export const globalValueMacroConfigCallback: CreationCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            if (!gvKey || !contentId) {
                logger.error(
                    `Invalid global value reference in macro: ${env.source.key} (code 1)`,
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
                    `Invalid global value reference in macro: ${env.source.key} (code 2)`,
                    true,
                    true
                );
            }

            return value;
        },
    };
};

export const globalValueWithMathMacroConfigCallback: CreationCallback = (context, params) => {
    params.fields.variables = {
        type: graphQlLib.list(graphQlLib.GraphQLFloat),
        resolve: (env) => {
            const keys = forceArray(env.source.keys);

            const variables = runInContext({ branch: 'master' }, () =>
                keys.reduce((acc, key) => {
                    const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(key);
                    if (!gvKey || !contentId) {
                        logger.error(
                            `Invalid global value reference in math macro: ${key} (code 1)`,
                            true,
                            true
                        );
                        return acc;
                    }

                    const value = getGlobalNumberValue(gvKey, contentId);
                    if (value === null) {
                        logger.error(
                            `Invalid global value reference in math macro: ${key} (code 2)`,
                            true,
                            true
                        );
                        return acc;
                    }

                    return [...acc, value];
                }, [])
            );

            // If any specified variables are missing, we return nothing to ensure
            // inconsistent/unintended calculations does not happen
            const hasMissingValues = keys.length !== variables.length;
            return hasMissingValues ? [] : variables;
        },
    };
};
