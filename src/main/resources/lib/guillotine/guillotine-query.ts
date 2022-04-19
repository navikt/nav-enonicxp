import graphQlLib from '/lib/graphql';
import { schema } from './schema/schema';
import { runInBranchContext } from '../utils/branch-context';
import { RepoBranch } from '../../types/common';
import { mergeGuillotineArray, mergeGuillotineObject } from './utils/merge-json';

export type AsJsonKey = `${string}AsJson`;

export type GuillotineRecord = {
    [key: string]: GuillotineRecord | string | GuillotineArray;
    [key: AsJsonKey]: GuillotineRecord;
};

export type GuillotineArray = GuillotineRecord[];

type GraphQLResponse = {
    data?: {
        guillotine?: {
            get?: GuillotineRecord;
            query?: GuillotineArray;
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

export const guillotineQuery = ({
    query,
    branch,
    jsonBaseKeys,
    params = {},
    throwOnErrors = false,
}: GuillotineQueryParams) => {
    const result = runInBranchContext(
        () => graphQlLib.execute<undefined, GraphQLResponse>(schema, query, params),
        branch
    );

    const { data, errors } = result;

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

    if (!data?.guillotine) {
        return null;
    }

    const { get: getResult, query: queryResult } = data.guillotine;

    // We don't have any good Typescript integration with Guillotine/GraphQL atm
    // so just return as any for now...
    return {
        get: (jsonBaseKeys && getResult
            ? mergeGuillotineObject(getResult, jsonBaseKeys)
            : getResult) as any,
        query: (jsonBaseKeys && queryResult
            ? mergeGuillotineArray(queryResult, jsonBaseKeys)
            : queryResult) as any,
    };
};
