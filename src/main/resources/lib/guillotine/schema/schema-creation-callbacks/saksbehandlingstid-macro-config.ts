import { ResolverEnv, SchemaExtension } from '../../utils/creation-callback-utils';
import {
    getGlobalCaseTime,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../global-values/global-value-utils';
import { runInContext } from '../../../context/run-in-context';
import { logger } from '../../../utils/logging';

const CASE_TIME_TYPE = 'SaksbehandlingstidMacroData';

const resolveCaseTime = (env: ResolverEnv) => {
    const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
    if (!gvKey || !contentId) {
        logger.error(
            `Invalid global case time reference in macro: ${env.source.key} (code 1)`,
            true,
            true
        );
        return null;
    }

    const caseTimeData = runInContext({ branch: 'master' }, () =>
        getGlobalCaseTime(gvKey, contentId)
    );

    if (!caseTimeData) {
        logger.error(
            `Invalid global case time reference in macro: ${env.source.key} (code 2)`,
            true,
            true
        );
        return null;
    }

    return {
        unit: caseTimeData.unit,
        value: caseTimeData.value,
    };
};

export const saksbehandlingstidMacroCallback: SchemaExtension = (graphQL, typeName) => ({
    types: {
        [CASE_TIME_TYPE]: {
            description: 'Saksbehandlingstid macro data',
            fields: {
                unit: { type: graphQL.GraphQLString },
                value: { type: graphQL.GraphQLInt },
            },
        },
    },
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                caseTime: { type: graphQL.reference(CASE_TIME_TYPE) },
            });
        },
    },
    resolvers: {
        [typeName]: {
            caseTime: resolveCaseTime,
        },
    },
});
