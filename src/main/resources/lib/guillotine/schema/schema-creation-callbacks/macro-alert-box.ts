import { SchemaExtension } from '../../utils/creation-callback-utils';
import { decode } from '/assets/html-entities/2.5.2/lib';
import striptags from '/assets/striptags/3.2.0/src/striptags';
import { processRichTextHtml } from '../../utils/process-rich-text-html';

export const macroAlertboxCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            // The Guillotine app types htmlareas in macro configs as RichText. We resolve the body
            // to a processed html string, as with lib-guillotine.
            params.addFields({
                body: { type: graphQL.GraphQLString },
            });
        },
    },
    resolvers: {
        [typeName]: {
            body: (env) => {
                // Remove non-encoded tags from the macro body. Non-encoded tags are inserted by the
                // content/component-level htmlarea editor in content studio, we don't want these in the
                // macro body. Only tags from the macro-level editor should be included.
                const encodedHtmlOnly = striptags(env.source.body);

                // Html from the macro-editor are encoded with html-entities, decode this to actual html
                const decodedHtml = decode(encodedHtmlOnly);

                // We return only the processedHtml string rather than the whole object from processHtml.
                // This will exclude macro and image data, however we don't allow images or nested
                // macros in this particular macro anyway.
                return processRichTextHtml(decodedHtml).processedHtml;
            },
        },
    },
});
