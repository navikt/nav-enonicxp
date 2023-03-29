import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { forceArray } from '../../../../utils/array-utils';
import { CreationCallback, graphQlCreateObjectType } from '../../../utils/creation-callback-utils';
import { logger } from '../../../../utils/logging';
import { OpeningHours } from '../../../../../site/mixins/opening-hours/opening-hours';

const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;

/* When a shared referance is made, only the id will come in as part of the object.
 * If this is the case, retrieve the content manually. Otherwise,
 * just return the original  specialOpeningHoursobject.
 */

type SupportedContactTypes = 'chat' | 'telephone';

type RawSpecialOpeningHours = OpeningHours['specialOpeningHours'];

type CustomSpecialOpeningHours = Extract<RawSpecialOpeningHours, { _selected: 'custom' }>;

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const getSpecialOpeningHoursObject = (
    specialOpeningHours: RawSpecialOpeningHours,
    contactType: SupportedContactTypes
): CustomSpecialOpeningHours | null => {
    if (!specialOpeningHours) {
        return null;
    }

    // The specialOpeningHours object already contains opening information,
    // rather than being a reference to another content, so just return it.
    if (specialOpeningHours._selected === 'custom') {
        return specialOpeningHours;
    }

    const sharedSpecialOpeningIds = forceArray(
        specialOpeningHours.shared.sharedSpecialOpeningHours
    );

    const referencedDocuments = contentLib.query({
        count: sharedSpecialOpeningIds.length,
        contentTypes: ['no.nav.navno:contact-information'],
        sort: 'createdTime ASC',
        filters: {
            ids: {
                values: sharedSpecialOpeningIds,
            },
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.contactType._selected',
                            values: [contactType],
                        },
                    },
                ],
            },
        },
    }).hits;

    // Used for error log if more than one relevant document is found.
    const relevantDocumentIds: string[] = [];

    const relevantWithinDateRange = referencedDocuments.reduce(
        (
            collection: CustomSpecialOpeningHours[],
            doc: contentLib.Content<'no.nav.navno:contact-information'>
        ) => {
            const { _selected } = doc.data.contactType;

            const specialOpeningHours = (doc.data.contactType as any)[_selected]
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
            if (!isWithinRange) {
                return collection;
            }

            relevantDocumentIds.push(doc._id);
            return [...collection, specialOpeningHours];
        },
        []
    );

    if (relevantWithinDateRange.length > 1) {
        logger.critical(
            `More than one active special opening hour found for contact information: ${relevantDocumentIds.join(
                ','
            )}`
        );
    }

    // Should only be one special opening hour object. If there are more, return the first one.
    // This practice has been OK'ed by editors.
    return relevantWithinDateRange[0];
};

export const createOpeningHoursFields =
    (contactType: SupportedContactTypes): CreationCallback =>
    (context, params) => {
        if (!context.types.regularOpeningHour) {
            context.types.regularOpeningHour = graphQlCreateObjectType(context, {
                name: 'RegularOpeningHour',
                fields: {
                    dayName: { type: graphQlLib.GraphQLString },
                    from: { type: graphQlLib.GraphQLString },
                    to: { type: graphQlLib.GraphQLString },
                    status: { type: graphQlLib.GraphQLString },
                },
            });
        }

        if (!context.types.regularOpeningHours) {
            context.types.regularOpeningHours = graphQlCreateObjectType(context, {
                name: 'RegularOpeningHours',
                fields: {
                    hours: { type: graphQlLib.list(context.types.regularOpeningHour) },
                },
            });
        }

        if (!context.types.specialOpeningHour) {
            context.types.specialOpeningHour = graphQlCreateObjectType(context, {
                name: 'SpecialOpeningHour',
                fields: {
                    date: { type: graphQlLib.GraphQLString },
                    from: { type: graphQlLib.GraphQLString },
                    to: { type: graphQlLib.GraphQLString },
                    status: { type: graphQlLib.GraphQLString },
                },
            });
        }

        if (!context.types.specialOpeningHours) {
            context.types.specialOpeningHours = graphQlCreateObjectType(context, {
                name: 'SpecialOpeningHours',
                fields: {
                    validFrom: { type: graphQlLib.GraphQLString },
                    validTo: { type: graphQlLib.GraphQLString },
                    hours: { type: graphQlLib.list(context.types.specialOpeningHour) },
                },
            });
        }

        params.fields.regularOpeningHours = {
            type: context.types.regularOpeningHours,
            resolve: (env) => {
                const { regularOpeningHours = {} } = env.source;

                if (Object.keys(regularOpeningHours).length === 0) {
                    return null;
                }

                return {
                    hours: dayNames.map((dayName) => {
                        const openingHours = regularOpeningHours[dayName];

                        if (!openingHours) {
                            return { dayName, status: 'CLOSED' };
                        }

                        return { ...openingHours, dayName, status: 'OPEN' };
                    }),
                };
            },
        };

        params.fields.specialOpeningHours = {
            type: context.types.specialOpeningHours,
            resolve: (env) => {
                const rawSpecialOpeningHours: RawSpecialOpeningHours =
                    env.source.specialOpeningHours;
                const specialOpeningHours = getSpecialOpeningHoursObject(
                    rawSpecialOpeningHours,
                    contactType
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
