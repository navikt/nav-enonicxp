const contentLib = require('/lib/xp/content');
const eventLib = require('/lib/xp/event');
const { cacheInvalidateEventName } = require('/lib/siteCache');
const { wipeSitecontentEntryWithReferences } = require('/lib/siteCache');

const handleGet = (req) => {
    const { contentId } = req.params;

    if (!contentId) {
        const msg = 'No contentId specified for cache invalidate service';
        log.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const content = contentLib.get({ key: contentId });

    if (!content) {
        const msg = `No content found for id ${contentId}`;
        log.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    eventLib.send({
        type: cacheInvalidateEventName,
        distributed: true,
        data: { id: content._id, path: content._path },
    });

    log.info(`Manually triggered cache invalidation for ${content._path}`);

    return { status: 204 };
};

exports.get = handleGet;
