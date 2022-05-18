import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import {
    getGlobalNumberValue,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../global-values/global-value-utils';
import { runInBranchContext } from '../../../utils/branch-context';
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
                    true
                );
                return null;
            }

            const value = runInBranchContext(
                () => getGlobalNumberValue(gvKey, contentId),
                'master'
            );

            if (value === null) {
                logger.error(
                    `Invalid global value reference in macro: ${env.source.key} (code 2)`,
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

            const variables = runInBranchContext(
                () =>
                    keys.reduce((acc, key) => {
                        const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(key);
                        if (!gvKey || !contentId) {
                            logger.error(
                                `Invalid global value reference in math macro: ${key} (code 1)`,
                                true
                            );
                            return acc;
                        }

                        const value = getGlobalNumberValue(gvKey, contentId);
                        if (value === null) {
                            logger.error(
                                `Invalid global value reference in math macro: ${key} (code 2)`,
                                true
                            );
                            return acc;
                        }

                        return [...acc, value];
                    }, []),
                'master'
            );

            // If any specified variables are missing, we return nothing to ensure
            // inconsistent/unintended calculations does not happen
            const hasMissingValues = keys.length !== variables.length;
            return hasMissingValues ? [] : variables;
        },
    };
};
