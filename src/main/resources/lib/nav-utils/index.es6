const libs = {
    content: require('/lib/xp/content'),
    i18n: require('/lib/xp/i18n'),
    portal: require('/lib/xp/portal'),
    moment: require('/assets/momentjs/2.14.1/min/moment-with-locales.min.js'),
};
// *********************************
// A collection of functions useful for Nav as
// a CMS2XP-project, but might also (with some tuning) be handy for other
// migration projects.
// *********************************
/**
 * Get the extension from the mime/type
 * Supported types, [Jpeg Png Gif Svg]
 * @param {Object} contentId The id to the image content
 */
function getExtensionForImage(contentId) {
    const mimeTypes = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
    };
    const content = libs.content.get({ key: contentId });
    const imageInfo = content.x && content.x.media ? content.x.media.imageInfo : false;

    if (imageInfo) {
        return mimeTypes[imageInfo.contentType] || '';
    }
    return '';
}

/**
 * Get the imageUrl for a contentId, wrapper to portal.imageUrl to handle extensions correctly
 * @param {String} contentId The id of the content
 */
function getImageUrl(contentId, scale = '') {
    const extension = getExtensionForImage(contentId);
    return libs.portal.imageUrl({
        id: contentId,
        format: extension,
        scale,
    });
}

/**
 * Return valid url for localhost (http)
 * @param {Object} req The request object
 */
function validUrl(req) {
    const url = req.url;
    if (url.indexOf('localhost') === -1 && url.indexOf('https://') === -1) {
        return url.replace('http', 'https');
    }
    return url;
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
 * Sort contents in the same order as the sorted array of ids.
 * @param {Object[]} contents Array of content objects.
 * @param {string[]} sortedIds Array of content ids.
 * @returns {Object[]} sorted array of contents.
 */
function sortContents(contents, sortedIds) {
    const sorted = [];
    const ids = exports.forceArray(sortedIds);
    let content = contents;

    ids.forEach(id => {
        let found = false;
        content = content.filter(item => {
            if (!found && item._id === id) {
                sorted.push(item);
                found = true;
                return false;
            }
            return true;
        });
    });
    return sorted;
}

/**
 * Get the value of a section or page parameter.
 * @param {Object} content Content object.
 * @param {string} paramName Parameter name.
 * @param {string} [defaultValue] Default value.
 * @returns {string|null} parameter value, undefined or defaultValue if not found.
 */
function getContentParam(content, paramName, defaultValue) {
    const parameters = content.data && content.data.parameters;
    if (!parameters) {
        return defaultValue;
    }
    const params = [].concat(parameters);
    let param;
    for (let i = 0, l = params.length; i < l; i++) {
        param = params[i];
        if (param.name === paramName) {
            return param.value;
        }
    }
    return defaultValue;
}

/**
 * Used for menus to get specific parameter's values. Probably could be tweaked
 * and merged with getContentParam ...
 */
function getParameterValue(content, paramName) {
    const parameters = content.data.parameters;
    if (!parameters) {
        return null;
    }
    const params = [].concat(parameters);
    let param;
    for (let i = 0, l = params.length; i < l; i++) {
        param = params[i];
        if (param.name === paramName) {
            return param.value;
        }
    }
    return null;
}

/**
 * Fetch a content by its cms menu key.
 * @param {string} cmsMenuKey Menu key.
 * @returns {object|null} content object or null if not found.
 */
function getContentByMenuKey(cmsMenuKey) {
    const queryResult = libs.content.query({
        start: 0,
        count: 1,
        query: 'x.' + app.name.replace(/\./g, '-') + ".cmsMenu.menuKey = '" + cmsMenuKey + "'",
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
}

/**
 * Fetch a content by its cms content key.
 * @param {string} contentKey Content key.
 * @returns {object|null} content object or null if not found.
 */
function getContentByCmsKey(contentKey) {
    log.info(
        'getContentByMenuKey query: ' +
            'x.' +
            app.name.replace(/\./g, '-') +
            ".cmsContent.contentKey = '" +
            contentKey +
            "'"
    );
    const queryResult = libs.content.query({
        start: 0,
        count: 1,
        query:
            'x.' + app.name.replace(/\./g, '-') + ".cmsContent.contentKey = '" + contentKey + "'",
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
}

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

function formatDate(date, language) {
    // use nb(DD.MM.YYYY) for everything except for english content(DD/MM/YYYY)
    return libs
        .moment(date)
        .locale(language === 'en' ? 'en-gb' : 'nb')
        .format('L');
}

function formatDateTime(date, language) {
    // use nb(DD.MM.YYYY) for everything except for english content(DD/MM/YYYY)
    return libs
        .moment(date)
        .locale(language === 'en' ? 'en-gb' : 'nb')
        .format('LLL');
}

function getLanguageVersions(content) {
    const lang = {
        no: 'Bokmål',
        en: 'English',
        se: 'Sámegiella',
        se_NO: 'Sámegiella',
        nn: 'Nynorsk',
        nn_NO: 'Nynorsk',
        pl: 'Polski',
    };
    let lRefs = content.data.languages;
    const ret = [
        {
            href: '#',
            tClass: 'active-lang',
            text: lang[content.language],
            title: lang[content.language] + ' (Språkversjon)',
        },
    ];
    if (!lRefs) {
        return [];
    }
    if (!Array.isArray(lRefs)) {
        lRefs = [lRefs];
    }
    lRefs.forEach(ref => {
        const el = libs.content.get({
            key: ref,
        });
        if (el) {
            ret.push({
                href: libs.portal.pageUrl({
                    id: ref,
                }),
                text: lang[el.language],
                tClass: '',
                title: lang[el.language] + ' (Språkversjon)',
            });
        }
    });
    return ret;
}

function dateTimePublished(content, language) {
    if (!content) {
        return '';
    }
    const navPublished = libs.i18n.localize({
        key: 'main_article.published',
        locale: language,
    });
    const p = fixDateFormat(content.publish.from ? content.publish.from : content.createdTime);
    const published = formatDate(p, language);
    const publishedString = `${navPublished} ${published}`;

    let modifiedString = '';
    const m = fixDateFormat(content.modifiedTime);
    if (new Date(m) > new Date(p)) {
        const navUpdated = libs.i18n.localize({
            key: 'main_article.lastChanged',
            locale: language,
        });
        const lastModified = formatDate(content.modifiedTime, language);
        modifiedString = ` | ${navUpdated} ${lastModified}`;
    }
    return publishedString + modifiedString;
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

/* Creates a uppercase hex number with at least length digits from a given number

   https://stackoverflow.com/questions/10937225/how-to-print-literal-unicode-string-in-javascript
 */

function fixedHex(number, length) {
    let str = number.toString(16).toUpperCase();
    while (str.length < length) str = '0' + str;
    return str;
}

/* Creates a unicode literal based on the string */
function unicodeLiteral(str) {
    let i;
    let result = '';
    for (i = 0; i < str.length; ++i) {
        /* You should probably replace this by an isASCII test */
        if (str.charCodeAt(i) > 126 || str.charCodeAt(i) < 32)
            result += '\\u' + fixedHex(str.charCodeAt(i), 4);
        else result += str[i];
    }

    return result;
}

/* Returns the content path of the site */
function getSitePath() {
    try {
        const siteInfo = libs.portal.getSite();
        return siteInfo && siteInfo._path ? siteInfo._path + '/' : '';
    } catch (e) {
        log.error('Kan ikke hente ut site-info');
        log.error(e);
        return '';
    }
}

module.exports = {
    dateTimePublished,
    fixDateFormat,
    forceArray,
    formatDate,
    formatDateTime,
    getAllChildren,
    getContentByCmsKey,
    getContentByMenuKey,
    getContentParam,
    getLanguageVersions,
    getParameterValue,
    getImageUrl,
    validateUrl: validUrl,
    getExtensionForImage,
    sortContents,
    unicodeLiteral,
    getSitePath,
};
