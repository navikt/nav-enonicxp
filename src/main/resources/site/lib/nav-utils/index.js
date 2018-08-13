var libs = {
	content: require('/lib/xp/content'),
	i18n: require('/lib/xp/i18n'),
	moment: require('/lib/moment'),
	util: require('/lib/enonic/util')
}

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
	//if (sortedIds.isArray) {
    if (typeof sortedIds === 'string') sortedIds = [sortedIds];
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
 * Used for menus to get specific parameter's values. Probably could be tweaked and merged with getContentParam ...
 */
exports.getParameterValue = function(content, paramName) {
    var parameters = content.data.parameters;
    if (!parameters) {
        return null;
    }
    var params = [].concat(parameters), param;
    for (var i = 0, l = params.length; i < l; i++) {
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
exports.getContentByMenuKey = function (cmsMenuKey) {
    var queryResult = libs.content.query({
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
    var queryResult = libs.content.query({
        start: 0,
        count: 1,
        query: "x." + libs.util.app.getJsonName() + ".cmsContent.contentKey = '" + contentKey + "'"
    });
    return queryResult.count > 0 ? queryResult.hits[0] : null;
};

exports.dateTimePublished = function (content, language) {
    if (!content) return '';
    var navPublished = libs.i18n.localize({key: 'main-article.published', locale: language});
    var published = '', lastModified = '';
    var navUpdated = libs.i18n.localize({key: 'main-article.lastChanged', locale: language});

    if (language !== 'no' && language !== 'en') {
        published = libs.moment(content.publish.from).locale('no').format('L');
    } else {
        published = libs.moment(content.publish.from).locale(language).format('L');
    }

    if (language !== 'nn' && language !== 'se') {
        lastModified = libs.moment(content.modifiedTime).locale('no').format('L');
    } else {
        lastModified = libs.moment(content.modifiedTime).locale(language).format('L');
    }
    return navPublished + ' ' + published + (published !== lastModified ? ' | ' + navUpdated + ' ' + lastModified : '');
};
