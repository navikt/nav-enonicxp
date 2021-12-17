const contentLib = require('/lib/xp/content');
const { wipeSitecontentEntryWithReferences } = require('/lib/siteCache');

const handleGet = (req) => {
    const { contentId } = req.params;

    if (!contentId) {
        log.warning('No contentId specified for cache invalidate service');
        return {
            status: 400,
        };
    }

    const content = contentLib.get({ key: contentId });

    log.info(`Manually triggered cache invalidation for ${contentId}`);

    wipeSitecontentEntryWithReferences({ id: content._id, path: content._path });

    return { status: 204 };
};

exports.get = handleGet;
