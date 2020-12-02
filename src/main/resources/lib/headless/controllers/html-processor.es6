const portalLib = require('/lib/xp/portal');

const htmlProcessor = (req) => {
    const { html } = JSON.parse(req.body);

    if (!html) {
        return {
            contentType: 'text/html',
            body: '',
        };
    }

    const processedHtml = portalLib.processHtml({
        value: html,
        type: 'absolute',
    });

    return {
        contentType: 'text/html',
        body: processedHtml,
    };
};

exports.post = htmlProcessor;
