const transportPageFragment = `
    ...on no_nav_navno_TransportPage {
        dataAsJson
    }
`;

const transportPageShortFragment = `
    ...on no_nav_navno_TransportPage {
        data {
            ingress
        }
    }
`;

module.exports = { fragment: transportPageFragment, shortFragment: transportPageShortFragment };
