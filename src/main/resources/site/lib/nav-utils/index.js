/**
 * Sort contents in the same order as the sorted array of ids.
 * @param {Object[]} contents Array of content objects.
 * @param {string[]} sortedIds Array of ids.
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
