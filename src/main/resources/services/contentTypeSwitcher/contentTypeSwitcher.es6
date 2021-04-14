const nodeLib = require('/lib/xp/node');

const editor = (type) => (content) => {
    content.type = type;
    content.components = [];
    content.data = {};

    return content;
};

const setContentType = (repoId, contentId, contentType) => {
    try {
        const repo = nodeLib.connect({
            repoId: repoId,
            branch: 'draft',
        });

        repo.modify({ key: contentId, editor: editor(contentType) });
    } catch (e) {
        log.info(`Error while changing content type: ${e}`);
    }
};

const handleGet = (req) => {
    const { repoId, contentId, contentType } = req.params;

    setContentType(repoId, contentId, contentType);

    return {
        status: 204,
    };
};

exports.get = handleGet;
