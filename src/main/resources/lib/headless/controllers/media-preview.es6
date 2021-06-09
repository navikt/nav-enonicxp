const portalLib = require('/lib/xp/portal');

const mediaToPreview = {
    'media:image': true,
    'media:vector': true,
    'media:document': true,
};

const mediaPreview = (req) => {
    const referer = req.headers['Referer'];
    const isFromCSPreview = req.headers['Sec-Fetch-Dest'] === 'iframe';

    const content = portalLib.getContent();
    const shouldShowPreview = mediaToPreview[content.type];

    // Content studio preview sends double requests on media files, one with this
    // referer and one with a content-spesific referer
    if (!isFromCSPreview || referer?.includes('/admin/tool/com.enonic.app.contentstudio/main')) {
        const assetUrl = portalLib.attachmentUrl({
            path: content._path,
            type: 'absolute',
            download: !shouldShowPreview,
        });

        if (shouldShowPreview) {
            return {
                status: 302,
                headers: {
                    location: assetUrl,
                },
            };
        }

        return {
            status: 200,
            contentType: 'text/html',
            body: `<div style="padding: 2rem">Forhåndvisning ikke tilgjengelig for denne fil-typen - <a href="${assetUrl}">Last ned</a></div>`,
        };
    }

    // Prevent double response for the second CS-request
    return {
        status: 204,
    };
};

exports.get = mediaPreview;
