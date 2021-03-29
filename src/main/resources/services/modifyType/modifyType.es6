// const contentLib = require('/lib/xp/content');
const nodeLib = require('/lib/xp/node');
const contextLib = require('/lib/xp/context');

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

const handleGet = (req) => {
    const { path, type, branch = 'master', wipeData = false, wipeComponents = false } = req.params;

    if (!path || !type) {
        return {
            status: 400,
            body: { message: 'invalid request' },
            contentType: 'application/json',
        };
    }

    log.info(`Attempting to modify type of ${path} to ${type} on branch ${branch}`);

    try {
        const context = contextLib.get();

        const repo = nodeLib.connect({
            repoId: context.repository,
            branch: branch,
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        });

        repo.modify({ key: `/content${path}`, editor: editor(type, wipeData, wipeComponents) });
    } catch (e) {
        log.info(e);
        return {
            status: 400,
            body: { message: e },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: { message: 'Done' },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
