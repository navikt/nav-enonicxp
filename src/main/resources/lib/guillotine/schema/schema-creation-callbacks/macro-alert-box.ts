import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { decode } from '/assets/html-entities/2.1.0/lib';
import striptags from '/assets/striptags/3.1.1/src/striptags';

export const macroAlertboxCallback: CreationCallback = (context, params) => {
    params.fields.body.resolve = (env) => {
        // Remove non-encoded tags from the macro body. Non-encoded tags are inserted by the
        // content/component-level htmlarea editor in content studio, we don't want these in the
        // macro body. Only tags from the macro-level editor should be included.
        const encodedHtmlOnly = striptags(env.source.body);

        // Html from the macro-editor are encoded with html-entities, decode this to actual html
        const decodedHtml = decode(encodedHtmlOnly);

        const processedHtml = macroLib.processHtml({
            type: 'server',
            value: decodedHtml,
        });
        log.info('got here');
        log.info(JSON.stringify(processedHtml.processHtml));
        log.info(processedHtml.processHtml);

        // Htmlareas are not properly typed as richtext by guillotine when used in
        // macros (type will be a plain String). Therefore we return only the processedHtml string
        // rather than the whole object from processHtml. This will exclude macro and image data,
        // however we don't allow images or nested macros in this particular macro anyway.
        return processedHtml.processedHtml;
    };
};
