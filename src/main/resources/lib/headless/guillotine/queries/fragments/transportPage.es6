const { linkPanelsMixinFragment, seoMixinFragment } = require('./_mixins');

const transportPageFragment = `
    ...on no_nav_navno_TransportPage {
        data {
            ingress
            feedbackToggle
            ${linkPanelsMixinFragment}
            ${seoMixinFragment}
        }
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
