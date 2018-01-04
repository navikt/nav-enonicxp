var libs = {
	task: require('/lib/xp/task'),
	content: require('/lib/xp/content'),
	io: require('/lib/xp/io')
};

exports.execute = function () {
	log.info('==============');
    log.info('List Not In Use');
    log.info('==============');

//    log.info('* Not Implemented Yet *');

	var result = libs.content.query({
		start: 0,
		count: 10000,
		sort: "",
		query: "_path LIKE '/content/sites/www.nav.no/*'",
	});

    log.info(result.total + ' contents to list.');

    for (var i = 0; i < result.hits.length; i++) {
        libs.task.progress({
            info: 'Content ' + result.hits[i]._name,
            current: i + 1,
            total: result.total
        });
    }

    log.info(result.total + ' contents found.');
    log.info('---------------------------------');

    libs.task.progress({ info: result.total + ' contents found.'});

    return {
        ok: true
    }
};
