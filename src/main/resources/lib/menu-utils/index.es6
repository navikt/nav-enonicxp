import { UrlLookupTable } from './url-lookup-table';

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    io: require('/lib/xp/io'),
};

const getMegaMenu = ({ content, levels }) => {
    const menuToJson = (menuContent, menuLevel) => {
        let subMenus = [];

        if (menuLevel > 0) {
            subMenus = getMegaMenu({
                content: menuContent,
                levels: menuLevel,
            });
        }

        let path = libs.portal.pageUrl({
            id: menuContent.data.target,
        });

        if (menuContent.data.target) {
            const target = libs.content.get({
                key: menuContent.data.target,
            });

            if (target && target.type === `${app.name}:external-link`) {
                path = target.data.url;
            }
        }

        return {
            displayName: menuContent.displayName,
            path: app.config.env === 'p' ? path : UrlLookupTable.getUrlFromTable(path),
            displayLock: menuContent.data.displayLock,
            id: menuContent._id,
            hasChildren: subMenus.length > 0,
            children: subMenus,
        };
    };

    const subMenus = [];
    if (content) {
        const currentLevel = levels - 1;
        return libs.content
            .getChildren({
                key: content._id,
                start: 0,
                count: 100,
            })
            .hits.reduce((t, el) => {
                t.push(menuToJson(el, currentLevel));
                return t;
            }, subMenus);
    }
    return [];
};

exports.getMegaMenu = getMegaMenu;
