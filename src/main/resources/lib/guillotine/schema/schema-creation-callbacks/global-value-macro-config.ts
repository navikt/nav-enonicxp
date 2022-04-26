import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import {
    getGlobalValue,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../utils/global-value-utils';
import { runInBranchContext } from '../../../utils/branch-context';
import { forceArray } from '../../../utils/nav-utils';

export const globalValueMacroConfigCallback: CreationCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            return runInBranchContext(() => getGlobalValue(gvKey, contentId), 'master');
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

                        const value = getGlobalValue(gvKey, contentId);
                        return value ? [...acc, value] : acc;
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
