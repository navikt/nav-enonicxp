import striptags from '/assets/striptags/3.1.1/src/striptags';
import { CreationCallback } from '../../utils/creation-callback-utils';

const macroTagName = 'editor-macro';

const linebreakFilter = new RegExp(/(\r\n|\n|\r|\s)/g);

const macroTagFilter = new RegExp(`<${macroTagName}[^>]*>(.*?)</${macroTagName}>`, 'g');

export const richTextCallback: CreationCallback = (context, params) => {
    params.fields.processedHtml.resolve = (env) => {
        const { processedHtml } = env.source;

        return processedHtml
            ? processedHtml
                  // Strip linebreaks, as it may cause errors in the frontend parser
                  .replace(linebreakFilter, ' ')
                  // Strip html tags from the body of macro-tags. Fixes invalid html-nesting caused by the CS editor
                  .replace(macroTagFilter, (match: string) => {
                      return striptags(match, [macroTagName]);
                  })
            : processedHtml;
    };
};
