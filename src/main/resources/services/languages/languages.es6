const libs = {
    utils: require('/lib/nav-utils'),
    content: require('/lib/xp/content'),
};

const handleGet = (req) => {
    const { id } = req.params;
    const content = libs.content.get({ key: id });
    const languages = libs.utils.getLanguageVersions(content);

    return {
        body: languages,
        contentType: 'application/json',
    };
};
exports.get = handleGet;
