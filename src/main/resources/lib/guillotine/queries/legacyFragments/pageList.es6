const { decoratorTogglesMixinFragment } = require('./_mixins');
const { seoMixinFragment } = require('./_mixins');

const pageListShortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
            hide_date
            hideSectionContentsDate
            orderSectionContentsByPublished
            ${decoratorTogglesMixinFragment}
            ${seoMixinFragment}
        }
    }
`;

module.exports = { shortFragment: pageListShortFragment };
