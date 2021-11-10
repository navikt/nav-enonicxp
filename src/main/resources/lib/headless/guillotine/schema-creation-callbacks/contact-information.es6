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
    log.info('contactInfoHere');
    log.info(JSON.stringify(context));
    const RegularOpeningHour = graphQlLib.createObjectType(context, {
        name: 'regularOpeningHour',
        fields: {
            day: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    const SpecialOpeningHour = graphQlLib.createObjectType(context, {
        name: 'specialOpeningHour',
        fields: {
            date: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    params.fields.regularOpeningHours = {
        type: graphQlLib.createObjectType(context, {
            name: 'regularOpeningHours',
            fields: {
                hours: { type: graphQlLib.list(RegularOpeningHour) },
            },
        }),
        resolve: (env) => {
            const { regularOpeningHours = {} } = env.source;
            const days = [
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
                'sunday',
            ];
            log.info(JSON.stringify(env));

            return {
                hours: days.map((day) => {
                    if (!regularOpeningHours[day]) {
                        return { day, status: 'CLOSED' };
                    }
                    return { day, ...regularOpeningHours[day], status: 'OPEN' };
                }),
            };
        },
    };

    params.fields.specialOpeningHours = {
        type: graphQlLib.createObjectType(context, {
            name: 'specialOpeningHours',
            fields: {
                title: { type: graphQlLib.GraphQLString },
                text: { type: graphQlLib.GraphQLString },
                footNote: { type: graphQlLib.GraphQLString },
                validFrom: { type: graphQlLib.GraphQLString },
                validTo: { type: graphQlLib.GraphQLString },
                hours: { type: graphQlLib.list(SpecialOpeningHour) },
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
};

module.exports = {
    contactInformationCallback,
};
