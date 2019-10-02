const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
};

export const getMegaMenu = (content, levels) => {
    let subMenus = [];
    if (content) {
        levels--;
        return libs.content
            .getChildren({
                key: content._id,
                start: 0,
                count: 100,
            })
            .hits.reduce((t, el) => {
                t.push(menuToJson(el, levels));
                return t;
            }, subMenus);
    } else {
        return [];
    }
};

const menuToJson = (content, levels) => {
    let subMenus = [];

    if (levels > 0) {
        subMenus = getMegaMenu(content, levels);
    }

    let path = libs.portal.pageUrl({
        id: content.data.target,
    });

    if (content.data.target) {
        const target = libs.content.get({
            key: content.data.target
        });

        if (target && target.type === `${app.name}:external-link`) {
            path = target.data.url;
        }
    }

    return {
        displayName: content.displayName,
        path,
        id: content._id,
        hasChildren: subMenus.length > 0,
        children: subMenus,
    };
};
