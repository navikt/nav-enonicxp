const contentLib = require('/lib/xp/content');

const menuListGetContent = (refs) => {
    log.info(JSON.stringify(refs));
    if (refs instanceof Object) {
        return Object.keys(refs).map((key) => {
            const ref = refs[key];
            return contentLib.get({ key: ref });
        });
    }
    return [contentLib.get({ key: refs })];
};

const menuListResolver = () => (env) => {
    log.info(JSON.stringify(env));
    const menuListItems = env.source['menuListItems'];

    if (!menuListItems) {
        return undefined;
    }

    log.info(JSON.stringify(menuListItems));

    const data = Object.keys(menuListItems)
        .map((key) => {
            const value = menuListItems[key];
            const isObject = value instanceof Object;
            const links = value.link;
            const files = value.files;
            return {
                [key]: isObject
                    ? {
                          ...(links && {
                              link: menuListGetContent(links),
                          }),
                          ...(files && {
                              files: menuListGetContent(files),
                          }),
                      }
                    : value,
            };
        })
        .reduce(
            (acc, value) => ({
                ...acc,
                ...value,
            }),
            {}
        );

    log.info(JSON.stringify(data));
    return data;
};

const menuListDataCallback = (context, params) => {
    params.fields.menuListItems.resolve = menuListResolver();
};

module.exports = menuListDataCallback;
