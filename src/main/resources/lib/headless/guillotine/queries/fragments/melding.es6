const { processedHtmlFragment } = require('./_processedHtml');

const meldingFragment = `
    ...on no_nav_navno_Melding {
        dataAsJson
        data {
            text ${processedHtmlFragment}
        }
    }
`;

module.exports = { fragment: meldingFragment };
