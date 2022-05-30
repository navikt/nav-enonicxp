import contentLib, { Content } from '/lib/xp/content';

export const getProductDetailsUsage = (content: Content<'no.nav.navno:product-details'>) => {
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

    return contentWithUsage;
};
