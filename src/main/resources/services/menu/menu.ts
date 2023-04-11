import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../lib/utils/logging';
import { getPublicPath } from '../../lib/paths/public-path';
import { CONTENT_LOCALE_DEFAULT } from '../../lib/constants';
import { getFromLocalCache } from '../../lib/cache/local-cache';

const CACHE_KEY = 'decorator-menu-cache';
const MENU_PATH = '/www.nav.no/dekorator-meny/';
const MY_PAGE_MENY_PATH_SEGMENT = '/my-page-menu';

type MenuItemContent = Content<'no.nav.navno:megamenu-item'>;

type MenuItem = {
    displayName: string;
    path: string;
    id: string;
    displayLock?: boolean;
    flatten?: boolean;
    isMyPageMenu?: boolean;
    hasChildren: boolean;
    children: MenuItem[];
};

const getTargetPath = (menuItem: MenuItemContent) => {
    const targetId = menuItem.data.target;
    if (!targetId) {
        return '';
    }

    const target = contentLib.get({ key: targetId });
    if (!target) {
        return '';
    }

    if (target.type === 'no.nav.navno:external-link') {
        return target.data.url;
    } else {
        return getPublicPath(target, CONTENT_LOCALE_DEFAULT);
    }
};

const menuItemContentTransformer = (menuItem: MenuItemContent): MenuItem => {
    const children = getMenuItemChildren(menuItem._id);

    return {
        displayName: menuItem.displayName,
        path: getTargetPath(menuItem),
        displayLock: menuItem.data.displayLock,
        flatten: menuItem.data.flatten,
        isMyPageMenu: menuItem._path.includes(MY_PAGE_MENY_PATH_SEGMENT) || undefined,
        id: menuItem._id,
        hasChildren: children.length > 0,
        children,
    };
};

const getMenuItemChildren = (contentId: string) => {
    return contentLib
        .getChildren({
            key: contentId,
            start: 0,
            count: 100,
        })
        .hits.reduce((acc, menuItemContent) => {
            if (menuItemContent.type !== 'no.nav.navno:megamenu-item') {
                return acc;
            }

            const itemTransformed = menuItemContentTransformer(menuItemContent);

            return itemTransformed ? [...acc, itemTransformed] : acc;
        }, [] as MenuItem[]);
};

export const get = () => {
    try {
        const menuContent = contentLib.get({ key: MENU_PATH });
        if (!menuContent) {
            return {
                status: 500,
                message: 'Menu content is not available',
            };
        }

        const menu = getFromLocalCache(CACHE_KEY, () => getMenuItemChildren(menuContent._id));

        return {
            body: menu,
            contentType: 'application/json',
        };
    } catch (e) {
        logger.critical(`Could not retrieve decorator menu! - ${e}`);

        return {
            status: 500,
            message: 'Server error',
        };
    }
};
