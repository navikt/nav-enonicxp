const globalValueSetFragment = `
    ...on no_nav_navno_GlobalValueSet {
        data {
            valueItems {
                numberValue
            }
            valueUsage(contentRef:$ref) {
                id
                path
                displayName
            }
        }
    }
`;

module.exports = { fragment: globalValueSetFragment };
