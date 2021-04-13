const nodeLib = require('/lib/xp/node');

const editor = (type, wipeData, wipeComponents) => (content) => {
    content.type = type;

    if (wipeComponents) {
        content.components = [];
    }

    if (wipeData) {
        content.data = {};
    }

    return content;
};

const setContentType = (repoId, contentId, contentType, wipeData, wipeComponents) => {
    try {
        const repo = nodeLib.connect({
            repoId: repoId,
            branch: 'draft',
        });

        repo.modify({ key: contentId, editor: editor(contentType, wipeData, wipeComponents) });
    } catch (e) {
        log.info(`Error while changing content type: ${e}`);
    }
};

const handleGet = (req) => {
    const { repoId, contentId, contentType, wipeData, wipeComponents } = req.params;

    setContentType(repoId, contentId, contentType, wipeData, wipeComponents);

    return {
        status: 204,
    };
};

exports.get = handleGet;
