// const contentLib = require('/lib/xp/content');
// const utils = require('/lib/nav-utils');
const htmlparser2 = require('/assets/htmlparser2');
// const domutils = require('/assets/domutils');

/*
const stripSpaces = (text) => {
    return text.replace(/(\s|&nbsp;), '');
};
*/

const htmlCleanUp = (htmlField) =>  {
    const dom = htmlparser2.parseDocument(htmlField);

    log.info(JSON.stringify(dom, null, 4));
    // Empty h-tags -> empty p
    // Strip all spaces if children are just text

    // Remove empty ul- & li-tags

    // Remove tabs and linebreaks
    /*
    html = html
        .replace(/(\t)/gm, '')
        .replace(/(\r\n|\n|\r)/gm, ' ');

    return html;
     */
};

module.exports = { htmlCleanUp };
