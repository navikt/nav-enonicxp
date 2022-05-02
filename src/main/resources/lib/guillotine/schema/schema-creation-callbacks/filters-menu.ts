import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const filterCallback: CreationCallback = (context, params) => {
    params.fields.id = {
        type: graphQlLib.GraphQLString,
    };
};
