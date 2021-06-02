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
    ...on no_nav_navno_ContentPageWithSidemenus {
        ${commonDataObject}
        data {
            ${productDataMixin}
        }
    }
`;

const situationPageFragment = `
    ...on no_nav_navno_SituationPage {
        ${commonDataObject}
        data {
            contactOptions {
                _selected
                chat {
                    ingress
                }
                write {
                    ingress
                }
                call {
                    ingress
                    phoneNumber
                }
            }
            ${productDataMixin}
        }
    }
`;

const dynamicPageFragment = `
    ${productPageFragment}
    ${situationPageFragment}
    ...on no_nav_navno_DynamicPage {
        ${commonDataObject}
    }
`;

const dynamicPageShortFragment = `
    ...on no_nav_navno_SituationPage {
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
    situationPageFragment,
};
