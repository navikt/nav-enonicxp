const { productDataMixin, situationDataMixin } = require('./_mixins');
const { decoratorTogglesMixinFragment } = require('./_mixins');
const { languagesMixinFragment } = require('./_mixins');
const { seoMixinFragment } = require('./_mixins');

const commonDataObject = `
    data {
        description
        customPath
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
            ${situationDataMixin}
        }
    }
`;

const employerSituationPageFragment = `
    ...on no_nav_navno_EmployerSituationPage {
        ${commonDataObject}
        data {
            ${situationDataMixin}
        }
    }
`;

const toolsPageFragment = `
    ...on no_nav_navno_ToolsPage {
        data {
            ${productDataMixin}
        }
    }
`;

const dynamicPageFragment = `
    ${productPageFragment}
    ${situationPageFragment}
    ${employerSituationPageFragment}
    ${toolsPageFragment}
    ...on no_nav_navno_DynamicPage {
        ${commonDataObject}
    }
`;

const dynamicPageShortFragment = `
    ...on no_nav_navno_SituationPage {
        ${commonDataObjectShort}
        data {
            title
            ingress
        }
    }
    ...on no_nav_navno_EmployerSituationPage {
        ${commonDataObjectShort}
        data {
            title
            ingress
        }
    }
    ...on no_nav_navno_ContentPageWithSidemenus {
        ${commonDataObjectShort}
        data {
            title
            ingress
        }
    }
    ...on no_nav_navno_ToolsPage {
        data {
            title
            ingress
        }
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
    toolsPageFragment,
};
