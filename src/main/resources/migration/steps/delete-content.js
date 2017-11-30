var taskLib = require('/lib/xp/task');
var contentLib = require('/lib/xp/content');
var ioLib = require('/lib/xp/io');

exports.execute = function () {
    log.info('Delete Content');
    log.info('==============');

    var deleteContentRes = ioLib.getResource('/migration/steps/deleteContentPaths.txt');
    if (!deleteContentRes.exists()) {
        return {
            ok: false,
            message: 'Could not find file with content paths to delete'
        }
    }

    var lines = ioLib.readLines(deleteContentRes.getStream());
    var i, path, deleted, total = 0;
    log.info(lines.length + ' contents to delete.');
    for (i = 0; i < lines.length; i++) {
        path = lines[i].trim();
        taskLib.progress({
            info: 'Deleting path ' + path,
            current: i + 1,
            total: lines.length
        });

        deleted = contentLib.delete({key: path});
        if (deleted) {
            log.info('Content deleted: ' + path);
            total++;
        } else {
            log.info('Content not found: ' + path);
        }
    }
    log.info(total + ' contents deleted.');
    log.info('---------------------------------');

    taskLib.progress({info: total + ' contents deleted.'});

    return {
        ok: true
    }
};