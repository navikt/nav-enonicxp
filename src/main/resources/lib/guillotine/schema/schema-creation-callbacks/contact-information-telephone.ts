import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { ContactInformation } from '../../../../site/content-types/contact-information/contact-information';
import { forceArray } from '../../../utils/nav-utils';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;

/* When a shared referance is made, only the id will come in as part of the object.
 * If this is the case, retrieve the content manually. Otherwise,
 * just return the original  specialOpeningHoursobject.
 */

type RawSpecialOpeningHours = Extract<
    ContactInformation['contactType'],
    { _selected: 'telephone' }
>['telephone']['specialOpeningHours'];

type CustomSpecialOpeningHours = Extract<RawSpecialOpeningHours, { _selected: 'custom' }>;

const getSpecialOpeningHoursObject = (
    specialOpeningHours: RawSpecialOpeningHours
): CustomSpecialOpeningHours | null => {
    if (!specialOpeningHours) {
        return null;
    }

    // The specialOpeningHours object already contains opening information,
    // rather than bein a referene to another content, so just return it.
    if (specialOpeningHours._selected === 'custom') {
        return specialOpeningHours;
    }

    const sharedSpecialOpeningIds = forceArray(
        specialOpeningHours.shared.sharedSpecialOpeningHours
    );

    const referencedDocuments = contentLib.query({
        contentTypes: ['no.nav.navno:contact-information'],
        filters: {
            ids: {
                values: sharedSpecialOpeningIds,
            },
        },
        count: 999,
    });

    // Used for error log if more than one relevant document is found.
    const relevantDocumentIds: string[] = [];

    const relevantWithinDateRange = referencedDocuments.hits.reduce(
        (
            collection: CustomSpecialOpeningHours[],
            doc: contentLib.Content<'no.nav.navno:contact-information'>
        ) => {
            if (doc.data.contactType._selected !== 'telephone') {
                return collection;
            }
            const specialOpeningHours = doc.data.contactType?.telephone
                .specialOpeningHours as CustomSpecialOpeningHours;

            if (!specialOpeningHours) {
                return collection;
            }
            const { validFrom, validTo } = specialOpeningHours.custom;

            if (!validFrom || !validTo) {
                return collection;
            }

            // Increase the range by 1 day to take 24h cache into account.
            const rangeFrom = Date.parse(validFrom) - MILLISECONDS_IN_A_DAY;
            const rangeTo = Date.parse(validTo) + MILLISECONDS_IN_A_DAY;
            const today = Date.now();

            const isWithinRange = today > rangeFrom && today < rangeTo;

            if (isWithinRange) {
                relevantDocumentIds.push(doc._id);
                return [...collection, specialOpeningHours];
            }

            return collection;
        },
        []
    );

    if (relevantWithinDateRange.length > 1) {
        log.error(
            `More than one active special opening hour found for contact information: ${relevantDocumentIds.join(
                ','
            )}`
        );
    }

    // Should only be one special opening hour object. If there are more, return the first one.
    // This practice has been OK'ed by editors.
    return relevantWithinDateRange[0];
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
            const rawSpecialOpeningHours: RawSpecialOpeningHours = env.source.specialOpeningHours;
            const specialOpeningHours = getSpecialOpeningHoursObject(rawSpecialOpeningHours);

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
