const meldingFragment = `
    ...on no_nav_navno_Melding {
        dataAsJson
        data {
            text(processHtml:{type:absolute})
        }
    }
`;

module.exports = { fragment: meldingFragment };
