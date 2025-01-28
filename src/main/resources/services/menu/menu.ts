import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../lib/utils/logging';
import { getPublicPath } from '../../lib/paths/public-path';
import { getFromLocalCache } from '../../lib/cache/local-cache';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getLayersData } from '../../lib/localization/layers-data';
import { buildCacheKeyForReqContext } from '../../lib/cache/utils';
import { replaceNAVwithNav } from '../../lib/utils/string-utils';

const CACHE_KEY = 'decorator-menu-cache';
const MENU_PATH = '/www.nav.no/dekorator-meny/';
const MY_PAGE_MENY_PATH_SEGMENT = '/my-page-menu';

type MenuItemContent = Content<'no.nav.navno:megamenu-item'>;

type MenuItem = {
    displayName: string;
    path: string;
    id: string;
    displayLock?: boolean;
    specialID?: string;
    flatten?: boolean;
    isMyPageMenu?: boolean;
    hasChildren: boolean;
    children: MenuItem[];
};

const getTargetPath = (menuItem: MenuItemContent, locale: string) => {
    const targetId = menuItem.data.target;
    if (!targetId) {
        return '';
    }

    const target = runInLocaleContext({ locale }, () => contentLib.get({ key: targetId }));
    if (!target) {
        return '';
    }

    if (target.type === 'no.nav.navno:external-link') {
        return target.data.url;
    } else {
        return getPublicPath(target, locale);
    }
};

const menuItemContentTransformer = (menuItem: MenuItemContent, locale: string): MenuItem => {
    const children = getMenuItemChildren(menuItem._id, locale);

    return {
        displayName: menuItem.displayName,
        path: getTargetPath(menuItem, locale),
        displayLock: menuItem.data.displayLock,
        specialID: menuItem.data.specialID,
        flatten: menuItem.data.flatten,
        isMyPageMenu: menuItem._path.includes(MY_PAGE_MENY_PATH_SEGMENT) || undefined,
        id: menuItem._id,
        hasChildren: children.length > 0,
        children,
    };
};

const getMenuItemChildren = (contentId: string, locale?: string) => {
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

            const itemTransformed = menuItemContentTransformer(
                menuItemContent,
                // The locale argument is only provided for non-root nodes. For the root nodes
                // we use the language on the node and propagate this down to the child menu items
                locale || menuItemContent.language || getLayersData().defaultLocale
            );

            return itemTransformed ? [...acc, itemTransformed] : acc;
        }, [] as MenuItem[]);
};

export const get = (req: XP.Request) => {
    try {
        const menuContent = contentLib.get({ key: MENU_PATH });
        if (!menuContent) {
            return {
                status: 500,
                message: 'Menu content is not available',
            };
        }

        const menu = getFromLocalCache(buildCacheKeyForReqContext(req, CACHE_KEY), () =>
            getMenuItemChildren(menuContent._id)
        );

        const replacedNAVwithNav = replaceNAVwithNav(menu);

        return {
            body: replacedNAVwithNav,
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
