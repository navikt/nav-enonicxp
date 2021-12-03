const macroTagName = 'editor-macro';
const macroTagStart = `<${macroTagName}`;
const macroTagEnd = `</${macroTagName}>`;

const linebreaksFilter = new RegExp(/(\r\n|\n|\r|\s)/gi);

// The content studio editor inserts <p>-tags around macros. This causes potential issues with
// invalid tag-nesting, so we remove these.
const macroStartFilter = new RegExp(`<p>${macroTagStart}`, 'gi');
const macroEndFilter = new RegExp(`${macroTagEnd}</p>`, 'gi');

const richTextCallback = (context, params) => {
    params.fields.processedHtml.resolve = (env) => {
        return env.source.processedHtml
            .replace(linebreaksFilter, ' ')
            .replace(macroStartFilter, macroTagStart)
            .replace(macroEndFilter, macroTagEnd);
    };
};

module.exports = { richTextCallback };
