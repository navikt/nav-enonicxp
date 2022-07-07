import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';
import {
    GlobalCaseTimeSetData,
    CaseTimeItem,
} from '../../../../types/content-types/global-case-time-set';

export const globalCaseTimeSetCallback: CreationCallback = (context, params) => {
    const valueItems: GraphQLResolver = {
        resolve: (env): CaseTimeItem[] => {
            return forceArray(env.source.valueItems).map((item) => ({
                ...item,
                type: 'caseTime',
            }));
        },
        type: graphQlLib.list(
            graphQlCreateObjectType<keyof CaseTimeItem>(context, {
                name: context.uniqueName('CaseTimeItem'),
                description: 'Saksbehandlingstid',
                fields: {
                    key: { type: graphQlLib.GraphQLString },
                    unit: { type: graphQlLib.GraphQLString },
                    value: { type: graphQlLib.GraphQLInt },
                    itemName: { type: graphQlLib.GraphQLString },
                    type: { type: graphQlLib.GraphQLString },
                },
            })
        ),
    };

    params.fields.data = {
        type: graphQlCreateObjectType<keyof GlobalCaseTimeSetData>(context, {
            name: context.uniqueName('no_nav_navno_GlobalCaseTimeSet_Data'),
            description: 'Data for saksbehandlingstider',
            fields: { valueItems },
        }),
    };
};
