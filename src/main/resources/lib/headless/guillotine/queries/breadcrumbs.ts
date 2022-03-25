import contentLib from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import { contentTypesWithBreadcrumbs } from '../../../contenttype-lists';

type Breadcrumb = {
    title: string;
    url: string;
};

export const getBreadcrumbs = (id: string): Breadcrumb[] => {
    const breadcrumbs = []; // Stores each menu item

    // Loop the entire path for current content based on the slashes. Generate
    // one JSON item node for each item. If on frontpage, skip the path-loop
    const arrVars = id.split('/');
    const arrLength = arrVars.length;
    for (let i = 3; i < arrLength - 1; i++) {
        // Skip three first items - the site, language, context - since it is handled separately.
        const lastVar = arrVars.pop();
        if (lastVar !== '') {
            const curItem = contentLib.get({
                key: arrVars.join('/') + '/' + lastVar,
            });
            // Make sure item exists
            if (curItem) {
                const item = {
                    title: curItem.displayName,
                    url: portalLib.pageUrl({
                        path: curItem._path,
                    }),
                };
                if (contentTypesWithBreadcrumbs[curItem.type]) {
                    breadcrumbs.push(item);
                }
            }
        }
    }
    return breadcrumbs.reverse();
};
