// XP8 includes object properties with null or undefined values in JSON responses, whereas XP7
// omitted these. Serialize the response body ourselves to keep the XP7 format, as our consumers
// (nav-enonicxp-frontend etc.) may rely on fields being absent rather than null.
// Null array elements are kept as-is.
export const stringifyWithoutNullValues = (body: unknown): string =>
    JSON.stringify(body, function (this: unknown, _key: string, value: unknown) {
        return value === null && !Array.isArray(this) ? undefined : value;
    });
