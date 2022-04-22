const {
    productDataMixin,
    situationDataMixin,
    guideDataMixin,
    themedArticleDataMixin,
} = require('./_mixins');
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
        title
        ingress
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

const guidePageFragment = `
    ...on no_nav_navno_GuidePage {
        ${commonDataObject}
        data {
            ${guideDataMixin}
        }
    }
`;

const themedArticlePageFragment = `
    ...on no_nav_navno_ThemedArticlePage {
        ${commonDataObject}
        data {
            ${themedArticleDataMixin}
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

const toolsPageFragment = `
    ...on no_nav_navno_ToolsPage {
        data {
            ${productDataMixin}
        }
    }
`;

const dynamicPageFragment = `
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
    ...on no_nav_navno_GuidePage {
        ${commonDataObjectShort}
    }
    ...on no_nav_navno_ThemedArticlePage {
        ${commonDataObjectShort}
    }
    ...on no_nav_navno_ToolsPage {
        data {
            title
            ingress
        }
    }
    ...on no_nav_navno_DynamicPage {
        data {
            description
        }
    }
`;

module.exports = {
    shortFragment: dynamicPageShortFragment,
    dynamicPageFragment,
    productPageFragment,
    situationPageFragment,
    themedArticlePageFragment,
    guidePageFragment,
    toolsPageFragment,
};
