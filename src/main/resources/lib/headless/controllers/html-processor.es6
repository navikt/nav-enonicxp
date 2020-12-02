const portalLib = require('/lib/xp/portal');

const htmlProcessor = (req) => {
    const { html, type } = JSON.parse(req.body);

    if (!html) {
        return {
            contentType: 'text/html',
            body: '',
        };
    }

    const processedHtml = portalLib.processHtml({
        value: html,
        type: type,
    });

    return {
        contentType: 'text/html',
        body: processedHtml,
    };
};

exports.post = htmlProcessor;
