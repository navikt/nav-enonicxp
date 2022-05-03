const overviewList = `
    ...on no_nav_navno_Overview {
        displayName
        data {
            productList {
                _id
                path
                title
                ingress
                taxonomy
                language
                audience
                area
                illustration {
                    __typename
                    data {
                        icons {
                            icon {
                                mediaUrl
                            }
                        }
                    }
                }
            }
        }
    }
`;

module.exports = {
    fragment: overviewList,
};
