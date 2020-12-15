const menuListItemsLinks = `
    links {
        url
        text
    }
`;

const menuListItemsFragment = `
    menuListItems {
        _selected
        selfservice {
            ${menuListItemsLinks}
        }
        formAndApplication {
            ${menuListItemsLinks}
        }
        processTimes {
            ${menuListItemsLinks}
        }
        relatedInformation {
            ${menuListItemsLinks}
        }
        international {
            ${menuListItemsLinks}
        }
        reportChanges {
            ${menuListItemsLinks}
        }
        rates {
            ${menuListItemsLinks}
        }
        appealRights {
            ${menuListItemsLinks}
        }
        membership {
            ${menuListItemsLinks}
        }
        rulesAndRegulations {
            ${menuListItemsLinks}
        }
    }
`;

const menuListItemsShortcutsFragment = `
    menuListItems {
        _selected
        shortcuts {
            ${menuListItemsLinks}
        }
    }
`;

module.exports = {
    fragment: menuListItemsFragment,
    shortcutsFragment: menuListItemsShortcutsFragment,
};
