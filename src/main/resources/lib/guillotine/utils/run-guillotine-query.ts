import httpClient from '/lib/http-client';
import { RepoBranch } from '../../../types/common';
import { mergeGuillotineArray, mergeGuillotineObject } from './merge-json';
import { logger } from '../../utils/logging';
import { getContextRepoId } from '../../context/run-in-context';
import { CONTENT_REPO_PREFIX, NAVNO_ROOT_PATH } from '../../constants';
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

const guillotineRootFieldRegex = /\bguillotine\s*\{/;

// The Guillotine app serves every project and branch from one endpoint, selected by arguments on
// the root field. Our queries run in the context's project, as with lib-guillotine in XP7. The site
// scope makes rich text resolve our app's macros, and generate page links relative to the site.
const addQueryScope = (query: string, branch: RepoBranch) =>
    query.replace(
        guillotineRootFieldRegex,
        `guillotine(project: "${getProjectIdFromContext()}", branch: "${branch}", scopeKey: "${NAVNO_ROOT_PATH}") {`
    );

// The Guillotine app returns media URLs as path and query string parts, where the query string is
// empty or starts with "?". Our queries select both for these fields, and the frontend expects a
// single URL string, as with lib-guillotine in XP7.
const urlPartsFields = new Set(['mediaUrl', 'imageUrl']);

type UrlParts = { path: string; queryString?: string };

const isUrlParts = (value: unknown): value is UrlParts =>
    typeof value === 'object' && value !== null && typeof (value as UrlParts).path === 'string';

const joinUrlParts = ({ path, queryString = '' }: UrlParts) => `${path}${queryString}`;

const rewriteUrlsInResult = (value: unknown): unknown => {
    if (typeof value === 'string') {
        return rewriteLoopbackUrls(value);
    }
    if (Array.isArray(value)) {
        return value.map(rewriteUrlsInResult);
    }
    if (typeof value === 'object' && value !== null) {
        return Object.keys(value).reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = rewriteUrlsInResult((value as Record<string, unknown>)[key]);
            return acc;
        }, {});
    }
    return value;
};

const parseResponseBody = (body: string): GraphQLResponse =>
    rewriteUrlsInResult(
        JSON.parse(body, (key: string, value: unknown) => {
            // Guillotine 8+ returns null elements for unresolvable references in content lists,
            // whereas lib-guillotine in XP7 omitted these
            if (Array.isArray(value)) {
                return value.filter((item) => item !== null);
            }
            if (urlPartsFields.has(key) && isUrlParts(value)) {
                return joinUrlParts(value);
            }
            return value;
        })
    ) as GraphQLResponse;

const executeQuery = (
    query: string,
    branch: RepoBranch,
    params: Record<string, string | boolean>
): GraphQLResponse => {
    const url = GUILLOTINE_API_URL;

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
        body: JSON.stringify({ query: addQueryScope(query, branch), variables: params }),
    });

    if (response.status !== 200 || !response.body) {
        return {
            errors: [
                {
                    message: `Guillotine request for ${getProjectIdFromContext()}/${branch} failed with ${response.status}`,
                },
            ],
        };
    }

    try {
        return parseResponseBody(response.body);
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
