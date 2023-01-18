import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { ContactInformation } from '../../../../site/content-types/contact-information/contact-information';
import { forceArray } from '../../../utils/nav-utils';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

/* When a shared referance is made, only the id will come in as part of the object.
 * If this is the case, retrieve the content manually. Otherwise,
 * just return the original  specialOpeningHoursobject.
 */

type SpecialOpeningHours = Extract<
    ContactInformation['contactType'],
    { _selected: 'telephone' }
>['telephone']['specialOpeningHours'];

const getSpecialOpeningHoursObject = (specialOpeningHours: SpecialOpeningHours) => {
    if (!specialOpeningHours) {
        return null;
    }

    if (specialOpeningHours._selected === 'shared') {
        const specialOpeningHoursIds = forceArray(
            specialOpeningHours.shared.sharedSpecialOpeningHours
        );

        const matchingDocuments = contentLib.query({
            query: `_id = "${specialOpeningHoursIds.join('" OR _id = "')}"`,
            contentTypes: ['no.nav.navno:contact-information'],
            count: 5555,
        });

        const activeIds: string[] = [];

        const relevantWithinDate = matchingDocuments.hits.reduce((collection: any[], doc: any) => {
            if (doc.data.contactType._selected !== 'telephone') {
                return collection;
            }
            const { specialOpeningHours } = doc.data.contactType.telephone;
            const { validFrom, validTo } = doc.custom;
            const validFromMS = Date.parse(validFrom);
            const validToMS = Date.parse(validTo);
            const startDateWithOffset = validFromMS - 1000 * 60 * 60 * 24;
            const endDateWithOffset = validToMS + 1000 * 60 * 60 * 24;
            const today = Date.now();

            const isActive = today > startDateWithOffset && today < endDateWithOffset;

            if (isActive) {
                activeIds.push(specialOpeningHours._id);
            }

            return [...collection, specialOpeningHours];
        }, []);

        if (relevantWithinDate.length > 1) {
            log.error(
                `More than one active special opening hour found for contact information: ${activeIds.join(
                    ','
                )}`
            );
        }

        // Should only be one special opening hour object. If there are more, return the first one.
        // This practice has been OK'ed by editors.
        return relevantWithinDate[0];
    }

    return specialOpeningHours;
};

export const contactInformationTelephoneCallback: CreationCallback = (context, params) => {
    const RegularOpeningHour = graphQlCreateObjectType(context, {
        name: 'regularOpeningHour',
        fields: {
            dayName: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    const SpecialOpeningHour = graphQlCreateObjectType(context, {
        name: 'specialOpeningHour',
        fields: {
            date: { type: graphQlLib.GraphQLString },
            from: { type: graphQlLib.GraphQLString },
            to: { type: graphQlLib.GraphQLString },
            status: { type: graphQlLib.GraphQLString },
        },
    });

    params.fields.regularOpeningHours = {
        type: graphQlCreateObjectType(context, {
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
        type: graphQlCreateObjectType(context, {
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
