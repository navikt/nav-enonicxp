const productDetailsFragment = `
    ...on no_nav_navno_ProductDetails {
        data {
            detailType
        }
    }
`;

module.exports = {
    fragment: productDetailsFragment,
};
