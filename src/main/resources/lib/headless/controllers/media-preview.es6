const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');

const mediaPreview = (req) => {
    const referer = req.headers['Referer'];
    const isFromCSPreview = req.headers['Sec-Fetch-Dest'] === 'iframe';

    const content = portalLib.getContent();

    // Content studio preview sends double requests on media files, one with this
    // referer and one with a content-spesific referer
    if (!isFromCSPreview || referer?.includes('/admin/tool/com.enonic.app.contentstudio/main')) {
        const assetUrl = portalLib.attachmentUrl({
            path: content._path,
            type: 'absolute',
        });
        log.info(`asset url: ${assetUrl}`);

        return {
            status: 302,
            headers: {
                location: assetUrl,
            },
        };
    }

    // Prevent double downloads with an empty response to the second CS-request
    return {
        status: 204,
    };
};

exports.get = mediaPreview;
