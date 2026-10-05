import httpClient from '/lib/http-client';
import { RepoBranch } from '../../../types/common';
import { mergeGuillotineArray, mergeGuillotineObject } from './merge-json';
import { logger } from '../../utils/logging';
import { getContextRepoId } from '../../context/run-in-context';
import { CONTENT_REPO_PREFIX } from '../../constants';
import { GUILLOTINE_API_URL, rewriteLoopbackUrls } from './loopback-urls';
import {
    buildForwardedQueryContextHeader,
    FORWARDED_QUERY_CONTEXT_HEADER,
} from './forwarded-query-context';

const CONNECTION_TIMEOUT_MS = 5000;
const READ_TIMEOUT_MS = 60000;

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
    params?: Record<string, string | boolean>;
    throwOnErrors?: boolean;
};

const getProjectIdFromContext = () => {
    const repoId = getContextRepoId();
    return repoId.replace(`${CONTENT_REPO_PREFIX}.`, '');
};

const executeQuery = (
    query: string,
    branch: RepoBranch,
    params: Record<string, string | boolean>
): GraphQLResponse => {
    const url = `${GUILLOTINE_API_URL}/${getProjectIdFromContext()}/${branch}`;

    const response = httpClient.request({
        url,
        method: 'POST',
        connectionTimeout: CONNECTION_TIMEOUT_MS,
        readTimeout: READ_TIMEOUT_MS,
        contentType: 'application/json',
        headers: {
            secret: app.config.serviceSecret,
            [FORWARDED_QUERY_CONTEXT_HEADER]: buildForwardedQueryContextHeader(),
        },
        body: JSON.stringify({ query, variables: params }),
    });

    if (response.status !== 200 || !response.body) {
        return {
            errors: [{ message: `Guillotine request to ${url} failed with ${response.status}` }],
        };
    }

    try {
        // Guillotine 8 returns null elements for unresolvable references in content lists, whereas
        // lib-guillotine in XP7 omitted these
        return JSON.parse(rewriteLoopbackUrls(response.body), (_key: string, value: unknown) =>
            Array.isArray(value) ? value.filter((item) => item !== null) : value
        );
    } catch (e) {
        return {
            errors: [{ message: `Invalid response from Guillotine request to ${url} - ${e}` }],
        };
    }
};

export const runGuillotineQuery = ({
    query,
    branch,
    jsonBaseKeys,
    params = {},
    throwOnErrors = false,
}: GuillotineQueryParams) => {
    const { data, errors } = executeQuery(query, branch, params);

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
