import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import {
    getGlobalValueSetNumberValue,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../global-values/global-value-utils';
import { runInBranchContext } from '../../../utils/branch-context';

export const globalValueCalculatorConfigCallback: CreationCallback = (context, params) => {
    params.fields.value = {
        type: graphQlLib.GraphQLFloat,
        resolve: (env) => {
            if (!env.source.key) {
                return null;
            }

            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            return runInBranchContext(
                () => getGlobalValueSetNumberValue(gvKey, contentId),
                'master'
            );
        },
    };
};
