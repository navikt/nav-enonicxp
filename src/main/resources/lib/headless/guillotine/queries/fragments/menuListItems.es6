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
        form_and_application {
            ${menuListItemsLinks}
        }
        process_times {
            ${menuListItemsLinks}
        }
        related_information {
            ${menuListItemsLinks}
        }
        international {
            ${menuListItemsLinks}
        }
        report_changes {
            ${menuListItemsLinks}
        }
        rates {
            ${menuListItemsLinks}
        }
        appeal_rights {
            ${menuListItemsLinks}
        }
        membership {
            ${menuListItemsLinks}
        }
        rules_and_regulations {
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
