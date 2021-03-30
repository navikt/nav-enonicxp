const nodeLib = require('/lib/xp/node');
var thymeleafLib = require('/lib/thymeleaf');

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

const setContentType = (repoId, contentId, type) => {
    try {
        const repo = nodeLib.connect({
            repoId: repoId,
            branch: 'draft',
            // user: {
            //     login: 'su',
            //     userStore: 'system',
            // },
            // principals: ['role:system.admin'],
        });

        repo.modify({ key: contentId, editor: editor(type) });
    } catch (e) {
        log.info(`Error while changing content type: ${e}`);
    }
};

const handleGet = (req) => {
    const { repositoryId } = req;
    const { contentId } = req.params;

    return {
        body: '<widget><div><h1>My first widget</h1></div></widget>',
        contentType: 'text/html',
    };
};

exports.get = handleGet;
