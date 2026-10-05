import * as contextLib from '/lib/xp/context';
import { logger } from '../../utils/logging';

// Guillotine queries are executed by the Guillotine app in a separate request (see
// run-guillotine-query.ts). Context attributes set by the caller are not available in that request,
// so we forward the attributes our resolvers depend on via a request header.
export const FORWARDED_QUERY_CONTEXT_HEADER = 'x-navno-query-context';

const FORWARDED_ATTRIBUTE_KEYS = ['locale', 'baseContentId'] as const;

type ForwardedAttributes = Partial<Record<(typeof FORWARDED_ATTRIBUTE_KEYS)[number], string>>;

export const buildForwardedQueryContextHeader = (): string => {
    const attributes = (contextLib.get().attributes || {}) as Record<string, unknown>;

    const forwardedAttributes = FORWARDED_ATTRIBUTE_KEYS.reduce<ForwardedAttributes>((acc, key) => {
        const value = attributes[key];
        if (typeof value === 'string') {
            acc[key] = value;
        }
        return acc;
    }, {});

    return JSON.stringify(forwardedAttributes);
};

const getHeaderValue = (headerName: string): string | null => {
    const portalRequest = Java.type('com.enonic.xp.portal.PortalRequestAccessor').get();
    const headers = portalRequest?.getHeaders();
    if (!headers) {
        return null;
    }

    const exactMatch = headers.get(headerName);
    if (exactMatch) {
        return String(exactMatch);
    }

    const keys: string[] = Java.from(headers.keySet().toArray());
    const matchingKey = keys.find((key) => key.toLowerCase() === headerName);

    return matchingKey ? String(headers.get(matchingKey)) : null;
};

const getForwardedAttributes = (): ForwardedAttributes | null => {
    const headerValue = getHeaderValue(FORWARDED_QUERY_CONTEXT_HEADER);
    if (!headerValue) {
        return null;
    }

    try {
        return JSON.parse(headerValue);
    } catch (e) {
        logger.error(`Invalid forwarded query context header: ${headerValue} - ${e}`);
        return null;
    }
};

// Runs a Guillotine resolver with the context attributes forwarded from the query caller
export const runInForwardedQueryContext = <ReturnType>(func: () => ReturnType): ReturnType => {
    const forwardedAttributes = getForwardedAttributes();
    if (!forwardedAttributes) {
        return func();
    }

    return contextLib.run({ attributes: forwardedAttributes }, func);
};
