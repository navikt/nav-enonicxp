const libs = {
    utils: require('/lib/nav-utils'),
};

const handleGet = (req) => {
    const { id } = req.params;
    const languages = libs.utils.getLanguageVersions(id);

    return {
        body: languages,
        contentType: 'application/json',
    };
};
exports.get = handleGet;
