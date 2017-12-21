var libs = {
	content: require('/lib/xp/content'),
	i18n: require('/lib/xp/i18n'),
	moment: require('/lib/moment'),
	util: require('/lib/enonic/util')
}

/**
 * Sort contents in the same order as the sorted array of ids.
 * @param {Object[]} contents Array of content objects.
 * @param {string[]} sortedIds Array of content ids.
 * @returns {Object[]} sorted array of contents.
 */
exports.sortContents = function (contents, sortedIds) {
    var sorted = [];
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
        })
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
    var params = [].concat(parameters), param;
    for (var i = 0, l = params.length; i < l; i++) {
        param = params[i];
        if (param.name === paramName) {
            return param.value;
        }
    }
    return defaultValue;
};

/**
 * Fetch a content by its cms menu key.
 * @param {string} cmsMenuKey Menu key.
 * @returns {object|null} content object or null if not found.
 */
exports.getContentByMenuKey = function (cmsMenuKey) {
    var queryResult = contentLib.query({
        start: 0,
        count: 1,
        query: "x." + libs.util.app.getJsonName() + ".cmsMenu.menuKey = '" + cmsMenuKey + "'"
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
};

/**
 * Fetch a content by its cms content key.
 * @param {string} contentKey Content key.
 * @returns {object|null} content object or null if not found.
 */
exports.getContentByCmsKey = function (contentKey) {
    log.info('getContentByMenuKey query: ' + "x." + libs.util.app.getJsonName() + ".cmsContent.contentKey = '" + contentKey + "'");
    var queryResult = contentLib.query({
        start: 0,
        count: 1,
        query: "x." + libs.util.app.getJsonName() + ".cmsContent.contentKey = '" + contentKey + "'"
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
};

exports.dateTimePublished = function (content, language) {
    var navPublished = i18nLib.localize({key: 'nav.published'});
    var published = '', lastModified = '';
    var navUpdated = i18nLib.localize({key: 'nav.updated'});

    if (language !== 'no' && language !== 'en') {
        published = moment(content.publish.from).locale('no').format('L');
    } else {
        published = moment(content.publish.from).locale(language).format('L');
    }

    if (language !== 'nn' && language !== 'se') {
        lastModified = moment(content.modifiedTime).locale('no').format('L');
    } else {
        lastModified = moment(content.modifiedTime).locale(language).format('L');
    }
    return navPublished + ' ' + published + (published !== lastModified ? ' | ' + navUpdated + ' ' + lastModified : '');
};
