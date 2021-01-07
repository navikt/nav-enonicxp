const { runInBranchContext } = require('/lib/headless/run-in-context');

const libs = {
    utils: require('/lib/nav-utils'),
    content: require('/lib/xp/content'),
};

// TODO: kan fjernes
const handleGet = (req) => {
    const { id, branch } = req.params;
    const content = runInBranchContext(() => libs.content.get({ key: id }), branch || req.branch);
    const languages = libs.utils.getLanguageVersions(content);

    return {
        body: { languages, currentLanguage: content?.language || 'no' },
        contentType: 'application/json',
    };
};
exports.get = handleGet;
