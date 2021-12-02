const macroLib = require('/lib/guillotine/macro');
const { decode } = require('/assets/html-entities/2.1.0/lib');

const macroAlertboxCallback = (context, params) => {
    params.fields.html.resolve = (env) => {
        log.info(`Raw body: ${JSON.stringify(env.source.html)}`);

        const decodedHtml = decode(env.source.html);
        log.info(`Decoded html: ${decodedHtml}`);

        const processedHtml = macroLib.processHtml({
            type: 'server',
            value: decodedHtml,
        });

        log.info(`Processed html: ${JSON.stringify(processedHtml)}`);

        return processedHtml.processedHtml;
    };
};

module.exports = { macroAlertboxCallback };
