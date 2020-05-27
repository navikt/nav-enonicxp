import { getUrlFromTable } from './url-lookup-table';

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    io: require('/lib/xp/io'),
};

const translateMenuItem = (content, targets) => {
    let path = '';

    if (content.data.target) {
        // don't include elements which are unpublished
        const target = targets[content.data.target];
        if (!target) {
            log.info(`${content._path} is missing a target`);
            return false;
        }
        // get the correct path
        path = libs.portal.pageUrl({
            id: content.data.target,
        });

        if (target && target.type === `${app.name}:external-link`) {
            path = target.url;
        }
    }

    return {
        displayName: content.displayName,
        path: app.config.env === 'p' ? path : getUrlFromTable(path),
        displayLock: content.data.displayLock,
        id: content._id,
        orgPath: content._path,
    };
};

const getMegaMenu = ({ content, levels }) => {
    if (content) {
        const query = `pathMatch('_path', '/content${content._path}', 3)`;
        const items = libs.content.query({
            query: query,
            count: 1000,
            contentTypes: [`${app.name}:megamenu-item`],
        });

        // find target items
        const targetIds = items.hits.reduce((acc, item) => {
            if (item.data.target) {
                acc.push(item.data.target);
            }
            return acc;
        }, []);
        const targets = libs.content
            .query({
                count: targetIds.length + 1,
                filters: {
                    ids: {
                        values: targetIds,
                    },
                },
            })
            .hits.reduce((acc, curr) => {
                acc[curr._id] = {
                    type: curr.type,
                    url: curr && curr.type === `${app.name}:external-link` ? curr.data.url : '',
                };
                return acc;
            });

        // Filter out results which haven't a valid target.
        const result = items.hits.reduce((acc, item) => {
            const translated = translateMenuItem(item, targets);
            if (translated) {
                acc.push(translated);
            }
            return acc;
        }, []);

        // group the results by path.
        const parents = {};
        result.forEach(item => {
            let slicedPath = item.orgPath.split('/');
            slicedPath = slicedPath.slice(3, slicedPath.length);

            let currentParent = parents;
            if (slicedPath.length === 1) {
                parents[slicedPath[0]] = { children: {}, obj: item };
            } else {
                // find my home or make it
                slicedPath.forEach((group, ix) => {
                    if (!Object.prototype.hasOwnProperty.call(currentParent, group)) {
                        // if we're at the last group key add the child else
                        // add the group key and continue
                        if (ix === slicedPath.length - 1) {
                            currentParent[group] = { children: {}, obj: item };
                        } else {
                            currentParent[group] = { children: {}, obj: {} };
                        }
                    }
                    currentParent = currentParent[group].children;
                });
            }
        });

        // Transform the tree to a list of lists structure
        const findTheChildren = parent => {
            const listedStruct = parent.obj;

            listedStruct.children = [];
            const childrenKeys = Object.keys(parent.children);
            childrenKeys.forEach(childKey => {
                const childObj = parent.children[childKey];
                // remove unneeded prop at this stage
                delete childObj.obj.orgPath;
                childObj.obj.hasChildren = true;
                if (Object.keys(childObj.children).length === 0) {
                    listedStruct.children.push({ ...childObj.obj, hasChildren: false });
                } else {
                    listedStruct.children.push(findTheChildren(childObj));
                }
            });
            return listedStruct;
        };
        // iterate over the top nodes and drill down to find their children
        const orderedList = Object.keys(parents).map(parent => {
            return findTheChildren(parents[parent]);
        });

        return orderedList;
    }

    return [];
};

exports.getMegaMenu = getMegaMenu;
