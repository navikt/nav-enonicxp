const macroLib = require('/lib/guillotine/macro');
const { decode } = require('/assets/html-entities/2.1.0/lib');

const macroAlertboxCallback = (context, params) => {
    params.fields.body.resolve = (env) => {
        log.info(`Raw body: ${JSON.stringify(env.source.body)}`);
        const debuggifiedHtml = env.source.body.replace(/<\/?p>/g, '');
        log.info(`Debuggified body: ${debuggifiedHtml}`);

        const decodedHtml = decode(debuggifiedHtml);
        log.info(`Decoded html: ${decodedHtml}`);

        const temp = macroLib.processHtml({
            type: 'server',
            value: decodedHtml,
        });

        log.info(`Processed html: ${JSON.stringify(temp)}`);

        return temp.processedHtml;
    };
};

module.exports = { macroAlertboxCallback };
