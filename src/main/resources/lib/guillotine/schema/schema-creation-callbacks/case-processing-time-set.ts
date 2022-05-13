import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';
import {
    CaseProcessingTimeData,
    CaseProcessingTimeItem,
} from '../../../../types/content-types/case-processing-time-set';

export const caseProcessingTimeSetCallback: CreationCallback = (context, params) => {
    const valueItems: GraphQLResolver = {
        resolve: (env): CaseProcessingTimeItem[] => {
            return forceArray(env.source.valueItems).map((item) => ({
                ...item,
                type: 'caseTime',
            }));
        },
        type: graphQlLib.list(
            graphQlCreateObjectType(context, {
                name: context.uniqueName('CaseProcessingTimeItem'),
                description: 'Saksbehandlingstid',
                fields: {
                    key: { type: graphQlLib.GraphQLString },
                    unit: { type: graphQlLib.GraphQLString },
                    value: { type: graphQlLib.GraphQLInt },
                    itemName: { type: graphQlLib.GraphQLString },
                    type: { type: graphQlLib.GraphQLString },
                } as Record<keyof CaseProcessingTimeItem, any>,
            })
        ),
    };

    params.fields.data = {
        type: graphQlCreateObjectType(context, {
            name: context.uniqueName('no_nav_navno_CaseProcessingTimeSet_Data'),
            description: 'Data for saksbehandlingstider',
            fields: { valueItems } as Record<keyof CaseProcessingTimeData, any>,
        }),
    };
};
