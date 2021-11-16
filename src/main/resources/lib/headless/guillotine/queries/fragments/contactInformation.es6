const contactInformationFragment = `
    ...on no_nav_navno_ContactInformation{
        data {
            contactType {
                telephone {
                    phoneNumber
                    title
                    text
                    alertText
                    regularOpeningHours {
                        hours {
                            day
                            from
                            to
                            status
                        }
                    }
                    specialOpeningHours  {
                        title
                        text
                        footNote
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
