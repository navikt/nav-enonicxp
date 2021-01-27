const { seoMixinFragment } = require('./_mixins');

const dynamicPageFragment = `
    ...on no_nav_navno_DynamicPage {
        data {
            feedbackToggle
            ${seoMixinFragment}
        }
    }
`;

module.exports = { fragment: dynamicPageFragment };
