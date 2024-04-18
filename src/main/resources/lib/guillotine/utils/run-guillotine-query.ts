import graphQlLib from '/lib/graphql';
import { schema } from '../schema/schema';
import { RepoBranch } from '../../../types/common';
import { mergeGuillotineArray, mergeGuillotineObject } from './merge-json';
import { logger } from '../../utils/logging';
import { runInContext } from '../../context/run-in-context';

// We don't have any good Typescript integration with Guillotine/GraphQL atm
// so just return as any for now...
type GraphQLResponse = {
    data?: {
        guillotine?: {
            get?: any;
            query?: any[];
        };
    };
    errors?: {
        message: string;
    }[];
};

export type GuillotineQueryParams = {
    query: string;
    branch: RepoBranch;
    jsonBaseKeys?: string[];
    params?: Record<string, string>;
    throwOnErrors?: boolean;
};

export const runGuillotineQuery = ({
    query,
    branch,
    jsonBaseKeys,
    params = {},
    throwOnErrors = false,
}: GuillotineQueryParams) => {
    const result = runInContext({ branch, asAdmin: true }, () =>
        graphQlLib.execute<undefined, GraphQLResponse>(schema, query, params)
    );

    const { data, errors } = result;

    if (errors) {
        const errorMsg = `GraphQL errors for ${JSON.stringify(params)}: ${errors
            .map((error) => error.message)
            .join(' :: ')}`;

        if (throwOnErrors) {
            throw new Error(errorMsg);
        } else {
            logger.error(errorMsg);
        }
    }

    if (!data?.guillotine) {
        return null;
    }

    const { get: getResult, query: queryResult } = data.guillotine;

    return {
        get: jsonBaseKeys && getResult ? mergeGuillotineObject(getResult, jsonBaseKeys) : getResult,
        query:
            jsonBaseKeys && queryResult
                ? mergeGuillotineArray(queryResult, jsonBaseKeys)
                : queryResult,
    };
};
