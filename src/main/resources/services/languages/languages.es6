const { runInBranchContext } = require('/lib/headless-utils/run-in-context');

const libs = {
    utils: require('/lib/nav-utils'),
    content: require('/lib/xp/content'),
};

const handleGet = (req) => {
    const { id, branch } = req.params;
    const content = runInBranchContext(() => libs.content.get({ key: id }), branch || req.branch);
    const languages = content ? libs.utils.getLanguageVersions(content) : [];

    return {
        body: languages,
        contentType: 'application/json',
    };
};
exports.get = handleGet;
