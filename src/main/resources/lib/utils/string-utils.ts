export const stripLineBreaks = (str: string) => str.replace(/\r?\n|\r/g, '');

export const capitalize = (str: string) =>
    str
        .split(' ')
        .map((letter) => {
            return `${letter
                .toLowerCase()
                .replace(/(^|[\s-])\S/g, (letter) => letter.toUpperCase())}`;
        })
        .join(' ');

const isProtected = (key?: string) => {
    if (!key) return false;
    const protectedKeys = new Set([
        '_id',
        '_path',
        'path',
        'type',
        'language',
        'formNumbers',
        'mediaUrl',
        '_childOrderValue',
        'descriptor',
        'anchorId',
    ]);

    return protectedKeys.has(key);
};

const replaceSingleString = (str: string): string => {
    const replacements: [string, RegExp, string][] = [
        ['NAV Hjelpemiddelsentral', /NAV Hjelpemiddelsentral/g, 'Nav hjelpemiddelsentral'],
        ['NAV Hjelpemidler', /NAV Hjelpemidler/g, 'Nav hjelpemidler'],
        ['NAV', /NAV/g, 'Nav'],
    ];

    return replacements.reduce(
        (acc, [search, regexp, replace]) =>
            str.includes(search) ? acc.replace(regexp, replace) : acc,
        str
    );
};

// This is a temporary replacement function as part of the NAV => Nav process
// To be removed when we have completely run the script as part 2.
export const replaceNAVwithNav = (element: any, key?: string): any => {
    if (!element) return element;

    if (typeof element === 'string' && !isProtected(key)) {
        return replaceSingleString(element);
    }

    if (typeof element !== 'object') return element;

    if (Array.isArray(element)) {
        return !isProtected(key) ? element.map((item) => replaceNAVwithNav(item, key)) : element;
    }

    // Reduce to construct a new object with replaced values
    return Object.keys(element).reduce((acc, key) => {
        const value = element[key];
        acc[key] =
            typeof value === 'string' && !isProtected(key)
                ? replaceSingleString(value)
                : replaceNAVwithNav(value, key);
        return acc;
    }, {} as any);
};
