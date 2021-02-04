const meldingFragment = `
    ...on no_nav_navno_Melding {
        dataAsJson
        data {
            text(processHtml:{type:server})
        }
    }
`;

module.exports = { fragment: meldingFragment };
