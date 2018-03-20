var taskLib = require('/lib/xp/task');
var contentLib = require('/lib/xp/content');
var ioLib = require('/lib/xp/io');

exports.execute = function () {
    log.info('Move Content');
    log.info('============');

    var moveContentRes = ioLib.getResource('/migration/steps/moveContentPaths.txt');
    if (!moveContentRes.exists()) {
        return {
            ok: false,
            message: 'Could not find file with content paths to move'
        }
    }

    var lines = ioLib.readLines(moveContentRes.getStream());
    var count = lines.reduce(function (c, line) {
        return !line.trim() || line.indexOf('#') === 0 ? c : c + 1;
    }, 0);

    var i, line, moved, total = 0, moveOp;
    log.info(count + ' contents to move.');
    for (i = 0; i < lines.length; i++) {
        line = lines[i].trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        moveOp = parseMoveLine(line);
        if (!moveOp) {
            log.warning('Invalid content to move: [' + line + ']')
            continue;
        }

        taskLib.progress({
            info: 'Moving ' + moveOp.from + ' => ' + moveOp.to,
            current: i + 1,
            total: lines.length
        });

        try {
            moved = contentLib.move({source: moveOp.from, target: moveOp.to});
            if (moved) {
                log.info('Content moved from "' + moveOp.from + '" to "' + moveOp.to + '"');
                total++;
            } else {
                log.warning('Content could not be moved from "' + moveOp.from + '" to "' + moveOp.to + '"');
            }
        } catch (e) {
            var isNotFound = e.class.name === 'com.enonic.xp.content.ContentNotFoundException';
            var pathAlreadyExists = e.class.name === 'com.enonic.xp.content.ContentAlreadyExistsException';
            if (isNotFound) {
                log.warning('Content not found: ' + moveOp.from);
            } else if (pathAlreadyExists) {
                log.warning('Content with path "' + moveOp.to + '" already exists');
            } else {
                log.error('Content could not be moved from "' + moveOp.from + '" to "' + moveOp.to + '"', e);
                e.printStackTrace();
            }
        }
    }
    log.info(total + ' contents moved.');
    log.info('---------------------------------');

    taskLib.progress({info: total + ' contents moved.'});

    return {
        ok: true
    }
};

function parseMoveLine(line) {
    var p = line.indexOf('->');
    if (p === -1) {
        return null;
    }
    var parts = line.split('->');
    return {
        from: parts[0].trim(), to: parts[1].trim()
    }
}