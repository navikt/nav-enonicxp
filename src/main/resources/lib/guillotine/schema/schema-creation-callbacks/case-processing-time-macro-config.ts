import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import {
    getCaseProcessingTime,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../global-values/global-value-utils';
import { runInBranchContext } from '../../../utils/branch-context';

export const saksbehandlingstidMacroCallback: CreationCallback = (context, params) => {
    params.fields.caseTime = {
        type: graphQlCreateObjectType(context, {
            name: 'CaseProcessingTimeMacroData',
            description: 'Saksbehandlingstid macro data',
            fields: {
                unit: { type: graphQlLib.GraphQLString },
                value: { type: graphQlLib.GraphQLInt },
            },
        }),
        resolve: (env) => {
            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
            if (!gvKey || !contentId) {
                return null;
            }

            const caseTimeData = runInBranchContext(
                () => getCaseProcessingTime(gvKey, contentId),
                'master'
            );

            if (!caseTimeData) {
                return null;
            }

            return {
                unit: caseTimeData.unit,
                value: caseTimeData.value,
            };
        },
    };
};
