const globalValueSetFragment = `
    ...on no_nav_navno_GlobalValueSet {
        data {
            values {
                key
                textValue
                numberValue
            }
        }
    }
`;

module.exports = { fragment: globalValueSetFragment };
