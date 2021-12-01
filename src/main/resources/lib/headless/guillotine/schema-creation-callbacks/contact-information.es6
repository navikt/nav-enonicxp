const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');
const navUtils = require('/lib/nav-utils');

/* When a shared referance is made, only the id will come in as part of the object.
 * If this is the case, retrieve the content manually. Otherwise,
 * just return the original  specialOpeningHoursobject.
 */
const getSpecialOpeningHoursObject = (specialOpeningHours) => {
    if (!specialOpeningHours) {
        return null;
    }
    if (specialOpeningHours._selected === 'shared') {
        const id = specialOpeningHours.shared.sharedSpecialOpeningHours;
        const openingHoursDocument = contentLib.get({ key: id });
        if (
            !(
                openingHoursDocument ||
                openingHoursDocument.data ||
                openingHoursDocument.data.contactType
            )
        ) {
            return null;
        }
        return openingHoursDocument.data.contactType.telephone.specialOpeningHours;
    }

    return specialOpeningHours;
};

const contactInformationCallback = (context, params) => {
    const RegularOpeningHour = graphQlLib.createObjectType(context, {
        name: 'regularOpeningHour',
        fields: {
            dayName: { type: graphQlLib.GraphQLString },
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
            if (Object.keys(regularOpeningHours).length === 0) {
                return null;
            }
            const dayNames = [
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
                'sunday',
            ];

            return {
                hours: dayNames.map((dayName) => {
                    if (!regularOpeningHours[dayName]) {
                        return { dayName, status: 'CLOSED' };
                    }
                    return { dayName, ...regularOpeningHours[dayName], status: 'OPEN' };
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

            // No specialOpeningHours are actually set by the editors.
            if (!(specialOpeningHours || specialOpeningHours.custom)) {
                return {};
            }

            if (!specialOpeningHours) {
                return {};
            }

            const { title, text, footNote, validFrom, validTo } = specialOpeningHours.custom;

            const hours = navUtils.forceArray(specialOpeningHours.custom.hours);

            // We want the special opening hours to have the same schema as regular
            // opening hours and also (just in case) to be sorted by date.
            const normalizedHours = hours
                .map(({ status, date }) => {
                    const openHours =
                        status._selected === 'open'
                            ? { from: status.open.from, to: status.open.to }
                            : {};

                    return {
                        date,
                        ...openHours,
                        status: status._selected.toUpperCase(),
                    };
                })
                .sort((a, b) => (a.date < b.date ? -1 : 1));

            return {
                footNote,
                hours: normalizedHours,
                text,
                title,
                validFrom,
                validTo,
            };
        },
    };
};

module.exports = {
    contactInformationCallback,
};
