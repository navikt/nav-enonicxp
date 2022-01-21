import nodeLib from '/lib/xp/node';

export const getParentPath = (path: string) =>
    path.split('/').slice(0, -1).join('/');

export const removeDuplicates = <Type>(
    array: Type[],
    isEqualPredicate?: (a: Type, b: Type) => boolean
) =>
    isEqualPredicate
        ? array.filter((aItem, aIndex) => {
              const bIndex = array.findIndex((bItem) =>
                  isEqualPredicate(aItem, bItem)
              );
              return aIndex === bIndex;
          })
        : array.filter((item, index) => array.indexOf(item) === index);

export const getUnixTimeFromDateTimeString = (datetime?: string): number => {
    if (!datetime) {
        return 0;
    }

    const validDateTime = datetime.split('.')[0];
    return new Date(validDateTime).getTime();
};

export const parseJsonArray = (json: string): any[] | null => {
    try {
        const array = JSON.parse(json);
        if (Array.isArray(array)) {
            return array;
        }
        log.error(
            `Expected JSON string to be array, got ${typeof array} - JSON: ${json}`
        );
        return null;
    } catch (e) {
        log.error(`Failed to parse JSON string ${json} - ${e}`);
        return null;
    }
};

// Date formats on content created in XP7 is not necessarily
// supported in the Date wrapper in XP7 (but it does work in browsers)
export const fixDateFormat = (date: string) => {
    if (date.indexOf('.') !== -1) {
        return date.split('.')[0] + 'Z';
    }
    return date;
};

export const forceArray = (item: any) => {
    if (item === undefined || item === null) {
        return [];
    }
    return Array.isArray(item) ? item : [item];
};

// Pushes nodes from draft to master, checking if theire already live
export const pushLiveElements = (targetIds: string[]) => {
    // publish changes
    const targets = targetIds.filter((elem) => {
        return !!elem;
    });

    const repoDraft = nodeLib.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
        principals: ['role:system.admin'],
    });
    const repoMaster = nodeLib.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'master',
        principals: ['role:system.admin'],
    });
    const masterHits = repoMaster.query({
        count: targets.length,
        filters: {
            ids: {
                values: targets,
            },
        },
    }).hits;
    const masterIds = masterHits.map((el) => el.id);

    // important that we use resolve false when pushing objects to master, else we can get objects
    // which were unpublished back to master without a published.from property
    if (masterIds.length > 0) {
        // PushNodeParams type is incorrect, should be key | keys
        // @ts-ignore
        const pushResult = repoDraft.push({
            keys: masterIds,
            resolve: false,
            target: 'master',
        });

        log.info(`Pushed ${masterIds.length} elements to master`);
        log.info(JSON.stringify(pushResult, null, 4));
        return pushResult;
    }
    log.info('No content was updated in master');
    return [];
};

// Get a nested object value from an array of keys
export const getNestedValueFromKeyArray = (
    obj: Record<string, any>,
    keys: string[]
): any => {
    if (!keys || keys.length === 0 || !obj || typeof obj !== 'object') {
        return null;
    }

    const [currentKey, ...rest] = keys;
    const currentValue = obj[currentKey];

    if (rest.length === 0) {
        return currentValue;
    }

    return getNestedValueFromKeyArray(currentValue, rest);
};

// Get a nested object value from a dot-delimited string of keys
export const getNestedValue = (
    obj: Record<string, any>,
    keysString: string
) => {
    return getNestedValueFromKeyArray(obj, keysString?.split('.'));
};

const hashCode = (str: string) => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        // eslint-disable-next-line
        hash = (hash << 5) - hash + char;
        // eslint-disable-next-line
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

const removeNullProperties = (obj: Record<string, any>) => {
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
            if (!Array.isArray(value) && Object.keys(value).length > 0) {
                acc[key] = removeNullProperties(value);
            }
            if (Array.isArray(value) && value.length > 0) {
                const moddedList = value.map((item) => {
                    if (typeof item === 'object') {
                        return removeNullProperties(item);
                    }
                    return typeof value === 'string' ? value : `${value}`;
                });
                acc[key] = moddedList.length === 1 ? moddedList[0] : moddedList;
            }
        } else if (value !== null) {
            acc[key] = typeof value === 'string' ? value : `${value}`;
        }
        return acc;
    }, {} as Record<string, any>);
};

export const createObjectChecksum = (obj: Record<string, any>) => {
    const cleanObj = removeNullProperties(obj);
    const serializedObj = JSON.stringify(cleanObj).split('').sort().join();
    return hashCode(serializedObj);
};
