var taskLib = require('/lib/xp/task');
var contextLib = require('/lib/xp/context');

var page = require('/migration/page/page');
var deleteStep = require('/migration/steps/delete-content');
var moveStep = require('/migration/steps/move-content');
var notinuseStep = require('/migration/steps/list-notinuse');


exports.get = function (req) {
    if (req.path.endsWith(app.name)) {
        return page.get(req);
    } else if (req.path.endsWith(app.name + '/status')) {
        return getTaskStatus(req);
    }

    return {
        status: 404,
        body: '<h3>Page not found</h3>',
        contentType: 'text/html'
    }
};

exports.post = function (req) {
    var action = req.params.action || '';
    var result = {ok: false, message: 'Task not found: "' + action + '"'};

    var taskId;
    if (action === 'deleteContent') {
        taskId = async('Delete Content', deleteStep.execute);

    } else if (action === 'listNotinuse') {
        taskId = async('List NotInUse', notinuseStep.execute);

    } else if (action === 'moveContent') {
        taskId = async('Move Content', moveStep.execute);
    }

    if (taskId) {
        result = {ok: true, id: taskId};
    }

    return {
        body: result,
        contentType: 'application/json'
    }
};

function async(name, callback) {
    var currentCtx = contextLib.get();

    return taskLib.submit({
        description: 'Migration task [' + name + ']',
        task: function () {
            contextLib.run(currentCtx, callback);
            log.info('Migration task [' + name + '] completed.');
        }
    });
}

function getTaskStatus(req) {
    var id = req.params.id || '';
    var taskInfo = taskLib.get(id);
    if (!taskInfo) {
        return {
            body: {
                done: true,
                result: 'Task not found'
            },
            contentType: 'application/json'
        }
    }

    return {
        body: {
            done: taskInfo.state === 'FINISHED',
            result: taskInfo.progress.info
        },
        contentType: 'application/json'
    }
}


