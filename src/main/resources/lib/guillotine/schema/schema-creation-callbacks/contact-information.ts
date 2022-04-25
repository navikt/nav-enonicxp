import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { ContactInformation } from '../../../../site/content-types/contact-information/contact-information';
import { forceArray } from '../../../utils/nav-utils';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

/* When a shared referance is made, only the id will come in as part of the object.
 * If this is the case, retrieve the content manually. Otherwise,
 * just return the original  specialOpeningHoursobject.
 */
const getSpecialOpeningHoursObject = (
    specialOpeningHours: ContactInformation['contactType']['telephone']['specialOpeningHours']
) => {
    if (!specialOpeningHours) {
        return null;
    }

    if (specialOpeningHours._selected === 'shared') {
        const id = specialOpeningHours.shared.sharedSpecialOpeningHours;
        if (!id) {
            return null;
        }

        const openingHoursDocument = contentLib.get<'no.nav.navno:contact-information'>({
            key: id,
        });
        if (!openingHoursDocument?.data?.contactType) {
            return null;
        }
        return openingHoursDocument.data.contactType.telephone.specialOpeningHours;
    }

    return specialOpeningHours;
};

export const contactInformationCallback: CreationCallback = (context, params) => {
    const RegularOpeningHour = graphQlCreateObjectType({
        name: 'regularOpeningHour',
        fields: {
            dayName: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    const SpecialOpeningHour = graphQlCreateObjectType({
        name: 'specialOpeningHour',
        fields: {
            date: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    params.fields.regularOpeningHours = {
        type: graphQlCreateObjectType({
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
        type: graphQlCreateObjectType({
            name: 'specialOpeningHours',
            fields: {
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
            if (specialOpeningHours?._selected !== 'custom') {
                return {};
            }

            const { validFrom, validTo, hours } = specialOpeningHours.custom;

            // We want the special opening hours to have the same schema as regular
            // opening hours and also (just in case) to be sorted by date.
            const normalizedHours = forceArray(hours)
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
                hours: normalizedHours,
                validFrom,
                validTo,
            };
        },
    };
};
