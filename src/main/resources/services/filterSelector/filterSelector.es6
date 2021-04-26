const portalLib = require('/lib/xp/portal');

const filterSelector = (req) => {
    const { ids, start, count, query } = req;
    log.info(`Filter req: ${JSON.stringify(req)}`);

    const content = portalLib.getContent();
    log.info(`Content: ${JSON.stringify(content)}`);

    return {
        status: 200,
        body: {
            total: 10,
            count: 2,
            hits: [
                {
                    id: 1,
                    displayName: 'Hit 1',
                },
                {
                    id: 2,
                    displayName: 'Hit 2',
                },
            ],
        },
    };
};

exports.get = filterSelector;
