const { generateCamelCase } = require('/lib/guillotine/util/naming');
const { forceArray } = require('/lib/nav-utils');

// Ensures option names for menuList follows the guillotine naming convention
const menuListItemsOptionsFilter = (content) => {
    if (!content.data.menuListItems) {
        return content;
    }

    const { _selected, ...menuListItems } = content.data.menuListItems;
    if (!menuListItems) {
        return content;
    }

    const menuListItemsFiltered = Object.keys(menuListItems).reduce(
        (acc, key) => ({ ...acc, [generateCamelCase(key)]: menuListItems[key] }),
        {}
    );

    const selected = forceArray(_selected).map((item) => generateCamelCase(item));

    return {
        ...content,
        data: {
            ...content.data,
            menuListItems: {
                ...menuListItemsFiltered,
                _selected: selected,
            },
        },
    };
};

const filterContentData = (content) => {
    if (!content?.data) {
        return content;
    }

    switch (content.__typename) {
        case 'no_nav_navno_MainArticle':
            return menuListItemsOptionsFilter(content);
        case 'no_nav_navno_FaqPage':
            return menuListItemsOptionsFilter(content);
        default:
            return content;
    }
};

module.exports = filterContentData;
