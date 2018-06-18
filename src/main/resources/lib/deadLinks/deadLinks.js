var content = require('/lib/xp/content');

exports.handle = function (socket) {
    var links = content.query({
        query: '"displayName" LIKE deadLinks'
    }).hits[0];

}