const calculatorFragment = `
    ...on no_nav_navno_Calculator {
        data {
            fields {
                inputField {
                    variableName
                    label
                    explanation
                }
                dropdownField {
                    variableName
                    label
                    explanation
                    optionItems {
                        label
                        value
                    }
                }
                globalValue {
                    variableName
                    value
                }
            }
            calculationScript
            useThousandSeparator
            summaryText
        }
    }
`;

module.exports = {
    fragment: calculatorFragment,
};
