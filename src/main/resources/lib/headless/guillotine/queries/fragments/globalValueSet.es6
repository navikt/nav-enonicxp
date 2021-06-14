const globalValueSetFragment = `
    ...on no_nav_navno_GlobalValueSet {
        data {
            valueItems {
                key
                itemName
                textValue
                numberValue
            }
        }
    }
`;

module.exports = { fragment: globalValueSetFragment };
