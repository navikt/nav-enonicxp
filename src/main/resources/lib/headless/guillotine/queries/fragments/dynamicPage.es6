const { productDataMixin } = require('./_mixins');
const { decoratorTogglesMixinFragment } = require('./_mixins');
const { languagesMixinFragment } = require('./_mixins');
const { seoMixinFragment } = require('./_mixins');

const commonDataObject = `
    data {
        description
        ${decoratorTogglesMixinFragment}
        ${languagesMixinFragment}
        ${seoMixinFragment}
    }
`;

const commonDataObjectShort = `
    data {
        description
    }
`;

const productPageFragment = `
    ...on no_nav_navno_OverviewPage {
        ${commonDataObject}
        data {
            ${productDataMixin}
        }
    }
    ...on no_nav_navno_ContentPageWithSidemenus {
        ${commonDataObject}
        data {
            ${productDataMixin}
        }
    }
`;

const dynamicPageFragment = `
    ${productPageFragment}
    ...on no_nav_navno_DynamicPage {
        ${commonDataObject}
    }
`;

const dynamicPageShortFragment = `
    ...on no_nav_navno_OverviewPage {
        ${commonDataObjectShort}
    }
    ...on no_nav_navno_ContentPageWithSidemenus {
        ${commonDataObjectShort}
    }
    ...on no_nav_navno_DynamicPage {
        ${commonDataObjectShort}
    }
`;

module.exports = {
    fragment: dynamicPageFragment,
    shortFragment: dynamicPageShortFragment,
    productPageFragment,
};
