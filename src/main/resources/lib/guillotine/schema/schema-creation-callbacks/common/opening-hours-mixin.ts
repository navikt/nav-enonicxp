import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { forceArray } from '../../../../utils/array-utils';
import { CreationCallback, graphQlCreateObjectType } from '../../../utils/creation-callback-utils';
import { logger } from '../../../../utils/logging';
import { OpeningHours } from '../../../../../site/mixins/opening-hours/opening-hours';

type SupportedContactType = 'chat' | 'telephone';

type RawSpecialOpeningHours = OpeningHours['specialOpeningHours'];

type CustomSpecialOpeningHours = Extract<RawSpecialOpeningHours, { _selected: 'custom' }>;

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const getValidTimeRangeQuery = (contactType: SupportedContactType) => {
    const now = Date.now();

    // Add an extra days margin to the date range in order to account for caching in the frontend
    const currentDate = new Date(now).toISOString();

    const dateFieldPrefix = `data.contactType.${contactType}.specialOpeningHours.custom`;

    return `${dateFieldPrefix}.validFrom <= instant("${currentDate}") AND ${dateFieldPrefix}.validTo > instant("${currentDate}")`;
};

/* When a shared referance is made, only the id will come in as part of the object.
 * If this is the case, retrieve the content manually. Otherwise,
 * just return the original specialOpeningHours object.
 */
const getSpecialOpeningHoursObject = (
    specialOpeningHours: RawSpecialOpeningHours,
    contactType: SupportedContactType
): { specialOpeningHours: CustomSpecialOpeningHours; text?: string } | null => {
    if (!specialOpeningHours) {
        return null;
    }

    // The specialOpeningHours object already contains opening information,
    // rather than being a reference to another content, so just return it.
    if (specialOpeningHours._selected === 'custom') {
        return { specialOpeningHours };
    }

    const sharedSpecialOpeningIds = forceArray(
        specialOpeningHours.shared.sharedSpecialOpeningHours
    );

    const { hits } = contentLib.query({
        count: sharedSpecialOpeningIds.length,
        contentTypes: ['no.nav.navno:contact-information'],
        sort: 'createdTime ASC',
        query: getValidTimeRangeQuery(contactType),
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
                    {
                        hasValue: {
                            field: `data.contactType.${contactType}.specialOpeningHours._selected`,
                            values: ['custom'],
                        },
                    },
                ],
            },
        },
    });

    if (hits.length === 0) {
        return null;
    }

    if (hits.length > 1) {
        logger.critical(
            `Multiple active special opening hour found for contact information: ${hits
                .map((hit) => hit._id)
                .join(', ')}`
        );
    }

    // Should only be one special opening hour object. Return the oldest if multiple are found
    const hitToReturn = hits[0];

    // The query parameters guarantees these types are correct for returned hits
    const selected = hitToReturn.data.contactType._selected as SupportedContactType;

    const contact = (hitToReturn.data.contactType as any)[selected];
    return {
        specialOpeningHours: contact.specialOpeningHours as CustomSpecialOpeningHours,
        text: (contact.text as string) || (contact.ingress as string),
    };
};

export const createOpeningHoursFields =
    (contactType: SupportedContactType): CreationCallback =>
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
                    overrideText: { type: graphQlLib.GraphQLString },
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

                const { specialOpeningHours, text } =
                    getSpecialOpeningHoursObject(rawSpecialOpeningHours, contactType) || {};

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
                    overrideText: text,
                    hours: normalizedHours,
                    validFrom,
                    validTo,
                };
            },
        };
    };
