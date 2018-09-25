

var pageNavApp = require('../../site/pages/page-nav-app/page-nav-app');

exports.get = function (req) {
    return pageNavApp.getFromService(req);
};