const libs = {
    content: require('/lib/xp/content'),
    node: require('/lib/xp/node'),
    moment: require('moment'),
};

/**
 * @description Date formats on content created in XP7 is not necessarily
 * supported in the Date wrapper in XP7 (but it does work in browsers)
 * @param {string} date Date
 * @returns {string} Correctly formated date
 */
function fixDateFormat(date) {
    if (date.indexOf('.') !== -1) {
        return date.split('.')[0] + 'Z';
    }
    return date;
}
function formatDateTime(date, language = 'nb') {
    // use nb(DD.MM.YYYY) for everything except for english content(DD/MM/YYYY)
    return libs
        .moment(fixDateFormat(date))
        .locale(language === 'en' ? 'en-gb' : 'nb')
        .format('lll');
}

/**
 * @description get all children of content
 * @param {object} content content to find all children of
 */
function getAllChildren(content) {
    let children = [];
    if (content.hasChildren) {
        let start = 0;
        const count = 100;
        let length = count;
        while (count === length) {
            const hits = libs.content.getChildren({
                key: content._id,
                start: start,
                count: count,
            }).hits;

            length = hits.length;
            start += length;

            children = children.concat(hits);
        }
    }

    return children;
}

/**
 * Make sure the content is an array.
 * @param {*} content Whatever is passed in
 * @returns {Object[]} Array containing the content or just content
 */
function forceArray(content) {
    if (content) {
        return Array.isArray(content) ? content : [content];
    }
    return [];
}

/**
 * Pushes nodes from draft to master, checking if theire already live
 * @param {*} targetIds ids of content to be pushed to master
 * @returns {Object} PushNodeResult
 */
function pushLiveElements(targetIds) {
    // publish changes
    const targets = targetIds.filter((elem) => {
        return !!elem;
    });

    const repoDraft = libs.node.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
        principals: ['role:system.admin'],
    });
    const repoMaster = libs.node.connect({
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
}

// Get a nested object value from an array of keys
const getNestedValueFromKeyArray = (obj, keys) => {
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
const getNestedValue = (obj, keysString) => {
    return getNestedValueFromKeyArray(obj, keysString?.split('.'));
};

module.exports = {
    forceArray,
    getAllChildren,
    pushLiveElements,
    formatDateTime,
    fixDateFormat,
    getNestedValue,
};
