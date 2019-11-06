var libs = {
    content: require('/lib/xp/content'),
    i18n: require('/lib/xp/i18n'),
    portal: require('/lib/xp/portal'),
    moment: require('/assets/momentjs/2.14.1/min/moment-with-locales.min.js'),
    // util: require('/lib/enonic/util')
};

// *********************************
// A collection of functions useful for Nav as a CMS2XP-project, but might also (with some tuning) be handy for other migration projects.
// *********************************

/**
 * Sort contents in the same order as the sorted array of ids.
 * @param {Object[]} contents Array of content objects.
 * @param {string[]} sortedIds Array of content ids.
 * @returns {Object[]} sorted array of contents.
 */
exports.sortContents = function (contents, sortedIds) {
    var sorted = [];
    // if (sortedIds.isArray) {
    if (typeof sortedIds === 'string') { sortedIds = [sortedIds]; }
    sortedIds.forEach(function (id) {
        var found = false;
        contents = contents.filter(function (content) {
            if (!found && content._id === id) {
                sorted.push(content);
                found = true;
                return false;
            } else {
                return true;
            }
        });
    });

    return sorted;
};

/**
 * Get the value of a section or page parameter.
 * @param {Object} content Content object.
 * @param {string} paramName Parameter name.
 * @param {string} [defaultValue] Default value.
 * @returns {string|null} parameter value, undefined or defaultValue if not found.
 */
exports.getContentParam = function (content, paramName, defaultValue) {
    var parameters = content.data && content.data.parameters;
    if (!parameters) {
        return defaultValue;
    }
    var params = [].concat(parameters);
    var param;
    for (var i = 0, l = params.length; i < l; i++) {
        param = params[i];
        if (param.name === paramName) {
            return param.value;
        }
    }
    return defaultValue;
};

/**
 * Used for menus to get specific parameter's values. Probably could be tweaked and merged with getContentParam ...
 */
exports.getParameterValue = function (content, paramName) {
    var parameters = content.data.parameters;
    if (!parameters) {
        return null;
    }
    var params = [].concat(parameters);
    var param;
    for (var i = 0, l = params.length; i < l; i++) {
        param = params[i];
        if (param.name === paramName) {
            return param.value;
        }
    }
    return null;
};

/**
 * Fetch a content by its cms menu key.
 * @param {string} cmsMenuKey Menu key.
 * @returns {object|null} content object or null if not found.
 */
exports.getContentByMenuKey = function (cmsMenuKey) {
    var queryResult = libs.content.query({
        start: 0,
        count: 1,
        query: 'x.' + app.name.replace(/\./g, '-') + ".cmsMenu.menuKey = '" + cmsMenuKey + "'",
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
};

/**
 * Fetch a content by its cms content key.
 * @param {string} contentKey Content key.
 * @returns {object|null} content object or null if not found.
 */
exports.getContentByCmsKey = function (contentKey) {
    log.info('getContentByMenuKey query: ' + 'x.' + app.name.replace(/\./g, '-') + ".cmsContent.contentKey = '" + contentKey + "'");
    var queryResult = libs.content.query({
        start: 0,
        count: 1,
        query: 'x.' + app.name.replace(/\./g, '-') + ".cmsContent.contentKey = '" + contentKey + "'",
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
};

exports.fixDateFormat = fixDateFormat;
/**
 * @description Date formats on content created in XP7 is not necessarily supported in the Date wrapper in XP7 (but it does work in browsers)
 * @param {string} date Date
 * @returns {string} Correctly formated date
 */
function fixDateFormat (date) {
    if (date.indexOf('.') !== -1) {
        date = date.split('.')[0] + 'Z';
    }
    return date;
}

exports.dateTimePublished = function (content, language) {
    if (!content) { return ''; }
    const navPublished = libs.i18n.localize({
        key: 'main_article.published', locale: language,
    });
    const p = fixDateFormat(content.publish.from ? content.publish.from : content.createdTime);
    const published = formatDate(p, language);
    const publishedString = `${navPublished} ${published}`;

    let modifiedString = '';
    const m = fixDateFormat(content.modifiedTime);
    if (new Date(m) > new Date(p)) {
        let navUpdated = libs.i18n.localize({
            key: 'main_article.lastChanged', locale: language,
        });
        const lastModified = formatDate(content.modifiedTime, language);
        modifiedString = ` | ${navUpdated} ${lastModified}`;
    }
    return publishedString + modifiedString;
};

exports.formatDate = formatDate;
function formatDate (date, language) {
    // use nb(DD.MM.YYYY) for everything except for english content(DD/MM/YYYY)
    return libs.moment(date).locale(language === 'en' ? 'en-gb' : 'nb').format('L');
};

exports.getLanguageVersions = function (content) {
    var lang = {
        no: 'Bokmål',
        en: 'English',
        se: 'Sámegiella',
        se_NO: 'Sámegiella',
        nn: 'Nynorsk',
        nn_NO: 'Nynorsk',
    };
    var lRefs = content.data.languages;
    var ret = [
        {
            href: '#',
            tClass: 'active-lang',
            text: lang[content.language],
            title: lang[content.language] + ' (Språkversjon)',
        },
    ];
    if (!lRefs) { return []; } else if (!Array.isArray(lRefs)) { lRefs = [lRefs]; }
    lRefs.forEach(function (ref) {
        var el = libs.content.get({
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
};

/**
 * @description get all children of content
 * @param {object} content content to find all children of
 */
exports.getAllChildren = function (content) {
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
};
