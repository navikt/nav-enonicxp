const macroLib = require('/lib/guillotine/macro');
const { decode } = require('/assets/html-entities/2.1.0/lib');

const macroAlertboxCallback = (context, params) => {
    params.fields.body.resolve = (env) => {
        // Remove <p>-tags from macro body in order to prevent invalid nesting caused by
        // buggy behaviour in the content-studio rich-text editor
        const debuggifiedHtml = env.source.body.replace(/<\/?p>/g, '');

        // Htmlarea code itself encoded with html-entities, decode to proper html characters
        const decodedHtml = decode(debuggifiedHtml);

        const processedHtml = macroLib.processHtml({
            type: 'server',
            value: decodedHtml,
        });

        log.info(processedHtml.processedHtml);

        // Htmlareas are not properly typed as richtext by guillotine when used in
        // macros (type will be a plain String). Therefore we return only the html-string,
        // rather than the whole processedHtml object. This excludes macro and image data,
        // however we don't allow images or nested macros in this particular macro anyway.
        return processedHtml.processedHtml;
    };
};

module.exports = { macroAlertboxCallback };
