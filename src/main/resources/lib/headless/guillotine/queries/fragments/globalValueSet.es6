const globalValueSetFragment = `
    ...on no_nav_navno_GlobalValueSet {
        data {
            valueItems {
                numberValue
            }
        }
    }
`;

module.exports = { fragment: globalValueSetFragment };
