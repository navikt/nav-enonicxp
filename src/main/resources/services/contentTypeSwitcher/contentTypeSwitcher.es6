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
        log.info(`Changed content type for ${contentId} to ${contentType}`);
    } catch (e) {
        log.error(
            `Error while attempting to change content type for ${contentId} to ${contentType} - ${e}`
        );
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
