import contentLib, { Content } from '/lib/xp/content';
import cacheLib from '/lib/cache';
import { logger } from '../../lib/utils/logging';
import { hasValidCustomPath } from '../../lib/custom-paths/custom-paths';
import { stripPathPrefix } from '../../lib/utils/nav-utils';

const cacheKey = 'decorator-menu-cache';
const menuPath = '/www.nav.no/dekorator-meny/';
const myPageMenuPathSegment = '/my-page-menu';

const cache = cacheLib.newCache({ size: 1, expire: 60 });

export const clearDecoratorMenuCache = () => {
    cache.clear();
};

type MenuItemContent = Content<'no.nav.navno:megamenu-item'>;

type MenuItem = {
    displayName: string;
    path: string;
    id: string;
    displayLock: boolean;
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
        return hasValidCustomPath(target) ? target.data.customPath : stripPathPrefix(target._path);
    }
};

const menuItemContentTransformer = (menuItem: MenuItemContent): MenuItem => {
    const children = getMenuItemChildren(menuItem._id);

    return {
        displayName: menuItem.displayName,
        path: getTargetPath(menuItem),
        displayLock: menuItem.data.displayLock,
        isMyPageMenu: menuItem._path.includes(myPageMenuPathSegment) || undefined,
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
        const menuContent = contentLib.get({ key: menuPath });
        if (!menuContent) {
            return {
                status: 500,
                message: 'Menu content is not available',
            };
        }

        const menu = cache.get(cacheKey, () => getMenuItemChildren(menuContent._id));

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
