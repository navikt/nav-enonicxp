import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const contentListDataCallback: CreationCallback = (context, params) => {
    params.fields.sortedBy = {
        type: graphQlLib.GraphQLString,
    };
};
