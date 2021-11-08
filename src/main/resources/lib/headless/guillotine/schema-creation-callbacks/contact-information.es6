const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');

/* When a shared referance is made, only the id will come in as part of the object,
 * so retrieve the content manually. Otherwise, just return the original object.
 */
const getSpecialOpeningHoursObject = (specialOpeningHours) => {
    if (specialOpeningHours._selected === 'shared') {
        const id = specialOpeningHours.shared.sharedSpecialOpeningHours;
        const openingHoursDocument = contentLib.get({ key: id });
        if (!(openingHoursDocument || openingHoursDocument.data)) {
            return null;
        }
        return openingHoursDocument.data.specialOpeningHours;
    }

    return specialOpeningHours;
};

const contactInformationCallback = (context, params) => {
    const OpeningHour = graphQlLib.createObjectType(context, {
        name: 'openingHour',
        fields: {
            date: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    params.fields.specialOpeningHours = {
        type: graphQlLib.createObjectType(context, {
            name: 'specialOpeningHours',
            fields: {
                title: { type: graphQlLib.GraphQLString },
                text: { type: graphQlLib.GraphQLString },
                footNote: { type: graphQlLib.GraphQLString },
                validFrom: { type: graphQlLib.GraphQLString },
                validTo: { type: graphQlLib.GraphQLString },
                hours: { type: graphQlLib.list(OpeningHour) },
            },
        }),
        resolve: (env) => {
            const specialOpeningHours = getSpecialOpeningHoursObject(
                env.source.specialOpeningHours
            );

            // If the specialOpeningHours was originally a reference to another content ("shared"),
            // the getSpecialOpeningHoursObject will have retireved the actual content,
            // which will always be put in the "custom" key.
            if (!(specialOpeningHours || specialOpeningHours.custom)) {
                return {};
            }

            const { title, text, footNote, validFrom, validTo, hours } = specialOpeningHours.custom;

            return {
                title,
                text,
                footNote,
                validFrom,
                validTo,
                hours: hours.map((hour) => {
                    const { status, date } = hour;

                    const open =
                        status._selected === 'open'
                            ? { from: status.open.from, to: status.open.to }
                            : {};

                    return {
                        date,
                        ...open,
                        status: status._selected.toUpperCase(),
                    };
                }),
            };
        },
    };

    params.fields.foo = {
        type: graphQlLib.GraphQLFloat,
        resolve: () => {
            return 3.222;
        },
    };
};

module.exports = {
    contactInformationCallback,
};
