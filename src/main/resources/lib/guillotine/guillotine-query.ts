import graphQlLib from '/lib/graphql';
import { schema } from './schema/schema';
import { runInBranchContext } from '../utils/branch-context';
import { RepoBranch } from '../../types/common';

type GraphQLResponse = {
    data?: {
        guillotine?: {
            get?: any;
            query?: any;
        };
    };
    errors?: {
        message: string;
    }[];
};

export const guillotineQuery = (
    query: string,
    params: Record<string, object>,
    branch: RepoBranch = 'master',
    throwOnErrors = false
) => {
    const queryResponse = runInBranchContext(
        () => graphQlLib.execute<undefined, GraphQLResponse>(schema, query, params),
        branch
    );

    const { data, errors } = queryResponse;

    if (errors) {
        const errorMsg = `GraphQL errors for ${JSON.stringify(params)}: ${errors
            .map((error) => error.message)
            .join(' :: ')}`;

        if (throwOnErrors) {
            throw new Error(
                `GraphQL errors for ${JSON.stringify(params)}: ${errors
                    .map((error) => error.message)
                    .join(' :: ')}`
            );
        } else {
            log.error(errorMsg);
        }
    }

    return data?.guillotine;
};
