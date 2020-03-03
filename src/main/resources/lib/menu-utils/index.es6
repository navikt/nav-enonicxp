const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    io: require('/lib/xp/io'),
};

const getUrlLookupTable = () => {
    // Q1, Q6
    try {
        const urlLookupFile = libs.io.getResource('/iac/url-lookup.json');
        if (urlLookupFile.exists()) {
            const urlLookupStream = urlLookupFile.getStream();
            const urlLookupJson = libs.io.readText(urlLookupStream);
            return JSON.parse(urlLookupJson);
        }
    } catch (error) {
        log.error(`Unable to parse url-lookup.json: ${error}`);
    }

    // Prod
    return undefined;
};

const urlLookupTable = getUrlLookupTable();
const getMegaMenu = (content, levels) => {
    const menuToJson = (menuContent, menuLevel) => {
        let subMenus = [];

        if (menuLevel > 0) {
            subMenus = getMegaMenu(menuContent, menuLevel);
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
            path: urlLookupTable ? urlLookupTable[path] : path,
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
