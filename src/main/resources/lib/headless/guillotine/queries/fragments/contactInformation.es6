const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const regularOpeningHours = days.map(
    (day, index) => `
${days[index]} {
    from
    to
}`
);

const ContactInformationFragment = `
    ...on no_nav_navno_ContactInformation{
        data {
            phoneNumber
            title
            text
            regularOpeningHours {
                ${regularOpeningHours}
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
`;

module.exports = {
    fragment: ContactInformationFragment,
};
