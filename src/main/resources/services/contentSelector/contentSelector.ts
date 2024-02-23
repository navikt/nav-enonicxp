import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import { generateFulltextQuery } from '../../lib/utils/mixed-bag-of-utils';
import { customSelectorHitWithLink, customSelectorParseSelectedIdsFromReq } from '../service-utils';
import { logger } from '../../lib/utils/logging';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { stripPathPrefix } from '../../lib/paths/path-utils';
import { parseJsonToArray, removeDuplicates } from '../../lib/utils/array-utils';
import { getNestedValues } from '../../lib/utils/object-utils';
import { stripLineBreaks } from '../../lib/utils/string-utils';

type SelectorHit = XP.CustomSelectorServiceResponseHit;

type ReqParams = {
    contentTypes?: string;
    selectorQuery?: string;
} & XP.CustomSelectorServiceRequestParams;

const CONTENT_FIELD_REF_PATTERN = /{(\w|\.|-|,|_| )+}/g;

const formatFieldValue = (value: string, withQuotes: boolean) =>
    withQuotes ? `"${value}"` : value;

const parseContentTypes = (contentTypesJson?: string) => {
    if (!contentTypesJson) {
        return null;
    }

    return parseJsonToArray<ContentDescriptor>(stripLineBreaks(contentTypesJson.trim()));
};

const injectValuesFromContent = (str: string) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error('Could not retrieve content from context');
        return str;
    }

    return str.replace(CONTENT_FIELD_REF_PATTERN, (match) => {
        const [fieldKey, withQuotes] = match.replace(/[{}]/g, '').split(',');

        const isWithQuotes = withQuotes?.trim() === 'true';

        const fieldValue = getNestedValues(content, fieldKey);
        if (typeof fieldValue === 'string') {
            return formatFieldValue(fieldValue, isWithQuotes);
        }

        if (Array.isArray(fieldValue)) {
            return fieldValue.map((value) => formatFieldValue(value, isWithQuotes)).join(',');
        }

        return JSON.stringify(fieldValue);
    });
};

const buildSelectorQuery = (selectorInput: string) => {
    return injectValuesFromContent(selectorInput);
};

const buildQuery = (userInput?: string, selectorInput?: string) => {
    const userQuery = userInput
        ? generateFulltextQuery(stripLineBreaks(userInput), ['displayName'], 'AND')
        : null;
    const selectorQuery = selectorInput ? buildSelectorQuery(stripLineBreaks(selectorInput)) : null;

    return [userQuery, selectorQuery].filter(Boolean).join(' AND ');
};

const transformHit = (content: Content): SelectorHit =>
    customSelectorHitWithLink(
        {
            id: content._id,
            displayName: `[${content.language}] ${content.displayName}`,
            description: stripPathPrefix(content._path),
        },
        content._id
    );

const getHitsFromQuery = (
    query: string,
    contentTypes?: ContentDescriptor[],
    sort?: string
): SelectorHit[] => {
    return contentLib
        .query({
            count: 1000,
            contentTypes: contentTypes,
            query: query || undefined,
            sort,
        })
        .hits.map(transformHit);
};

const getHitsFromIds = (ids: string[]) =>
    ids.reduce((acc, id) => {
        const content = contentLib.get({ key: id });
        if (!content) {
            return acc;
        }

        return [...acc, transformHit(content)];
    }, [] as SelectorHit[]);

// This service can be called from a CustomSelector input as a more advanced alternative to
// the built-in ContentSelector input type. Supports selecting based on custom queries, which
// may include values from the current content, enclosed in curly braces.
//
// If you need the value (or array item values) of a field enclosed in "quotes", pass "true" as a second parameter
// ie: {data.myKey,true}
//
// Example:
//
// <input name="myInput" type="CustomSelector">
//     <label>Choose content</label>
//     <config>
//         <service>contentSelector</service>
//         <param value="contentTypes">["no.nav.navno:my-content-type", "no.nav.navno:my-other-content-type"]</param>
//         <param value="selectorQuery">language="en" AND data.someReference="{_id}" AND data.foo IN ({data.bar,true})</param>
//     </config>
// </input>
//
export const get = (req: XP.Request) => {
    const {
        query: userQuery,
        contentTypes: contentTypesJson,
        selectorQuery,
        sort,
    } = req.params as ReqParams;

    const query = buildQuery(userQuery, selectorQuery);
    const contentTypes = parseContentTypes(contentTypesJson);

    const hitsFromIds = getHitsFromIds(customSelectorParseSelectedIdsFromReq(req));
    const hitsFromQuery = getHitsFromQuery(query, contentTypes || undefined, sort);
    const hits = removeDuplicates([...hitsFromIds, ...hitsFromQuery], (a, b) => a.id === b.id);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            hits: hits,
            count: hits.length,
            total: hits.length,
        },
    };
};
