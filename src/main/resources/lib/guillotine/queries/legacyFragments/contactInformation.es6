const contactInformationFragment = `
    ...on no_nav_navno_ContactInformation{
        _path
        data {
            contactType {
                telephone {
                    phoneNumber
                    title
                    text
                    alertText
                    regularOpeningHours {
                        hours {
                            dayName
                            from
                            to
                            status
                        }
                    }
                    specialOpeningHours  {
                        validFrom
                        validTo
                        hours {
                            date
                            from
                            to
                            status
                        }
                    }
                }
            }
        }
    }
`;

module.exports = {
    fragment: contactInformationFragment,
};
