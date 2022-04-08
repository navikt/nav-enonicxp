import graphQlLib from '/lib/graphql';
import { schema } from './schema/schema';
import { runInBranchContext } from '../utils/branch-context';
import { RepoBranch } from '../../types/common';
import { mergeGuillotineArrayJson, mergeGuillotineObjectJson } from './utils/merge-json';

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

export const guillotineQuery = ({
    query,
    branch,
    jsonBaseKeys,
    params = {},
    throwOnErrors = false,
}: {
    query: string;
    branch: RepoBranch;
    jsonBaseKeys?: string[];
    params?: Record<string, string>;
    throwOnErrors?: boolean;
}) => {
    log.info(`schema: ${schema}`);

    const response = runInBranchContext(
        () => graphQlLib.execute<undefined, GraphQLResponse>(schema, query, params),
        branch
    );

    const { data, errors } = response;

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

    return {
        ...(getResult && {
            get: (jsonBaseKeys
                ? mergeGuillotineObjectJson(getResult, jsonBaseKeys)
                : getResult) as any,
        }),
        ...(queryResult && {
            query: (jsonBaseKeys
                ? mergeGuillotineArrayJson(queryResult, jsonBaseKeys)
                : queryResult) as any[],
        }),
    };
};
