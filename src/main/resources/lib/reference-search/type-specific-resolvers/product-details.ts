import * as contentLib from '/lib/xp/content';

export const findProductDetailsReferences = (contentId: string) => {
    const content = contentLib.get({ key: contentId });
    if (!content) {
        return null;
    }

    const contentWithUsage = contentLib.query({
        start: 0,
        count: 1000,
        filters: {
            hasValue: {
                field: `data.${content.data.detailType}`,
                values: [content._id],
            },
        },
    }).hits;

    const overviewPages = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:overview'],
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.overviewType',
                            values: [content.data.detailType, 'all_products'],
                        },
                    },
                    {
                        hasValue: {
                            field: 'language',
                            values: [content.language],
                        },
                    },
                ],
            },
        },
    }).hits;

    return [...contentWithUsage, ...overviewPages];
};
