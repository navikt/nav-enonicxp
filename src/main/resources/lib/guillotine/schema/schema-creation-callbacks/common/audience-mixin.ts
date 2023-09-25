import graphQlLib from '/lib/graphql';
import { CreationCallback } from 'lib/guillotine/utils/creation-callback-utils';

export const audienceCallback: CreationCallback = (context, params) => {
    params.fields._selected.type = graphQlLib.GraphQLString;
};
