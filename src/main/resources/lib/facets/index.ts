// @ts-nocheck (this requires some effort for sensible typing, and it will probably be removed soon'ish anyway)
import nodeLib from '/lib/xp/node';
import contextLib from '/lib/xp/context';
import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import taskLib from '/lib/xp/task';
import repoLib from '/lib/xp/repo';
import {
    createObjectChecksum,
    fixDateFormat,
    forceArray,
    pushLiveElements,
    removeDuplicates,
} from '../utils/nav-utils';
import { logger } from '../utils/logging';

const repo = nodeLib.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

let toCheckOnNext = [];
const debounceTime = 5000;
let lastUpdate = 0;
let currentTask = null;

const getLastFacetConfig = (contentId) => {
    const versionFinder = __.newBean('tools.PublishedVersions');
    const versionTimestamps = JSON.parse(versionFinder.getLiveVersions(contentId));

    const allVersions = repo.findVersions({ key: contentId, count: 1000 });
    const content = allVersions.hits
        .filter((version) => 'commitId' in version)
        .map((version) => {
            const article = repo.get({
                key: contentId,
                versionId: version.versionId,
            });
            const timestamp = versionTimestamps[version.versionId] ?? '';
            // adding timestamp massage since nashorn Date can't handle ms
            return { article, timestamp: fixDateFormat(timestamp) };
        })
        .filter(({ article }) => {
            return article.workflow?.state !== 'IN_PROGRESS' && article.timestamp !== '';
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .reverse();
    return content.length > 2 ? content[1].article : [];
};

const getNavRepo = () => {
    return contextLib.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                idProvider: 'system',
            },
            principals: ['role:system.admin'],
        },
        () => {
            const hasNavRepo = repoLib.get('no.nav.navno');
            if (!hasNavRepo) {
                logger.info('Create no.nav.navno repo');
                repoLib.create({
                    id: 'no.nav.navno',
                });
            }

            const navRepo = nodeLib.connect({
                repoId: 'no.nav.navno',
                branch: 'master',
                user: {
                    login: 'su',
                },
                principals: ['role:system.admin'],
            });

            return navRepo;
        }
    );
};

export const getFacetValidation = () => {
    const navRepo = getNavRepo();
    let facetValidation = navRepo.get('/facetValidation');
    if (!facetValidation) {
        logger.info('Create facet validation node');
        facetValidation = navRepo.create({
            _name: 'facetValidation',
            parentPath: '/',
            refresh: true,
            data: {
                updateAll: false,
                justValidatedNodes: [],
            },
        });
    }

    return facetValidation;
};

const setUpdateAll = (updateAll) => {
    getNavRepo().modify({
        key: getFacetValidation()._path,
        editor: (facetValidation) => {
            return {
                ...facetValidation,
                data: { ...facetValidation.data, updateAll: updateAll },
            };
        },
    });
};

export const clearFacetUpdateState = () => {
    getNavRepo().modify({
        key: getFacetValidation()._path,
        editor: (facetValidation) => {
            return {
                ...facetValidation,
                data: {
                    updateAll: false,
                    justValidatedNodes: [],
                },
            };
        },
    });
};

const isUpdatingAll = () => {
    return getFacetValidation().data.updateAll;
};

const addValidatedNodes = (ids) => {
    getNavRepo().modify({
        key: getFacetValidation()._path,
        editor: (facetValidation) => {
            let justValidatedNodes = [];
            if (facetValidation.data.justValidatedNodes) {
                justValidatedNodes = forceArray(facetValidation.data.justValidatedNodes);
            }
            justValidatedNodes = justValidatedNodes.concat(ids);
            return {
                ...facetValidation,
                data: { ...facetValidation.data, justValidatedNodes },
            };
        },
    });
};

const removeValidatedNodes = (ids) => {
    getNavRepo().modify({
        key: getFacetValidation()._path,
        editor: (facetValidation) => {
            let justValidatedNodes = [];
            if (facetValidation.data.justValidatedNodes) {
                justValidatedNodes = forceArray(facetValidation.data.justValidatedNodes);
            }
            ids.forEach((id) => {
                justValidatedNodes.splice(justValidatedNodes.indexOf(id), 1);
            });
            return {
                ...facetValidation,
                data: { ...facetValidation.data, justValidatedNodes },
            };
        },
    });
};

const getJustValidatedNodes = () => {
    const facetValidation = getFacetValidation();
    return facetValidation.data.justValidatedNodes
        ? forceArray(facetValidation.data.justValidatedNodes)
        : [];
};

const updateFacets = (fasetter, ids) => {
    // create queries for each facet and subfacet
    const resolver = fasetter.reduce((t, el) => {
        const underfasett = forceArray(el.underfasetter);
        if (underfasett.length === 0 || !underfasett[0]) {
            t.push({
                fasett: el.name,
                query: el.rulekey + ' LIKE "' + el.rulevalue + '"',
            });
        } else {
            underfasett.forEach((value) => {
                t.push({
                    fasett: el.name,
                    underfasett: value.name,
                    query:
                        el.rulekey +
                        ' LIKE "' +
                        el.rulevalue +
                        '" AND ' +
                        value.rulekey +
                        ' LIKE "' +
                        value.rulevalue +
                        '"',
                });
            });
        }
        return t;
    }, []);

    if (ids) {
        logger.info('*** UPDATE FACETS ON ' + ids.join(', ') + ' ***');
    }
    // iterate over each facet update the ids which have been published
    resolver.forEach(function (value) {
        if (!ids) {
            logger.info(`Update facets on ${value.fasett} - ${value.underfasett}`);
        }

        const query = {
            query: value.query,
        };

        // filter for just the currently updated ids
        if (ids) {
            query.filters = {
                ids: {
                    values: ids,
                },
            };
        }

        const fasett = {
            fasett: value.fasett,
        };
        if (value.underfasett) fasett.underfasett = value.underfasett;
        let start = 0;
        let count = 1000;
        let hits = [];

        // make sure we get all the content, query 1k at a time.
        while (count === 1000) {
            query.start = start;
            query.count = count;

            const res = repo.query(query).hits;
            count = res.length;
            start += count;
            hits = hits.concat(res);
        }

        addValidatedNodes(hits.map((c) => c.id));
        const modifiedContent = hits.map((hit) => {
            logger.info(`adding ${fasett.fasett} and ${fasett.underfasett} to ${hit.id}`);

            const modifiedNode = repo.modify({
                key: hit.id,
                editor: (elem) => {
                    const n = elem;
                    n.x = !n.x ? {} : n.x;
                    n.x['no-nav-navno'] = !n.x['no-nav-navno'] ? {} : n.x['no-nav-navno'];
                    n.x['no-nav-navno'].fasetter = fasett;
                    return n;
                },
            });
            return modifiedNode ? modifiedNode._id : undefined;
        });
        if (modifiedContent.length > 0) {
            pushLiveElements(modifiedContent);
        }
    });

    if (!ids) {
        // unblock facet updates
        setUpdateAll(false);
    }
};

const bulkUpdateFacets = (facetConfig, ids) => {
    let fasetter = forceArray(facetConfig.data.fasetter);

    if (!ids) {
        logger.info('TAG ALL FACETS');
        const previousFacetConfig = getLastFacetConfig(facetConfig._id);
        if (previousFacetConfig) {
            const previous = forceArray(previousFacetConfig.data.fasetter);
            fasetter = fasetter.reduce((acc, rule, ix) => {
                const current = createObjectChecksum(rule);
                const previousRule = createObjectChecksum(previous[ix]);
                if (current !== previousRule) {
                    acc.push(rule);
                }
                return acc;
            }, []);
        }
        // block facet updates
        setUpdateAll(true);
    }
    updateFacets(fasetter, ids);
};

const getFacetConfig = () => {
    // get facet config
    // TODO: maybe create a better type for this
    const hits = repo.query({
        start: 0,
        count: 1,
        query: 'type = "navno.nav.no.search:search-config2"',
    }).hits;
    return hits.length > 0 ? repo.get(hits[0].id) : null;
};

export const checkIfUpdateNeeded = (nodeIds) => {
    // stop if update all is running
    if (isUpdatingAll()) {
        logger.info('blocked by update all');
        return;
    }
    const facetConfig = getFacetConfig();

    // update nodes that is not in the just validated nodes list
    if (facetConfig) {
        // run bulkUpdateFacets if the facet config is part of the nodes to update
        const isFacetConfigPartOfUpdate =
            nodeIds.filter((nodeId) => {
                return nodeId === facetConfig._id;
            }).length > 0;

        if (isFacetConfigPartOfUpdate) {
            bulkUpdateFacets(facetConfig);
            return;
        }

        // get list of just validated nodes
        const justValidatedNodes = getJustValidatedNodes();

        // sort nodes into update and ignore
        const nodeInfo = nodeIds.reduce(
            (c, nodeId) => {
                if (justValidatedNodes.indexOf(nodeId) === -1) {
                    c.update.push(nodeId);
                } else {
                    c.ignore.push(nodeId);
                }
                return c;
            },
            { ignore: [], update: [] }
        );

        logger.info('ignore ' + nodeInfo.ignore.length);

        // remove ignored nodes from just validated
        if (nodeInfo.ignore.length > 0) {
            removeValidatedNodes(nodeInfo.ignore);
        }

        // update nodes that is not in just validated
        if (nodeInfo.update.length > 0) {
            bulkUpdateFacets(facetConfig, nodeInfo.update);
        }
    } else {
        logger.error('no facetconfig');
    }
};

const facetHandler = (event) => {
    // stop fasett update if the node change is in another repo
    const cmsNodesChanged = event.data.nodes.filter((node) => {
        return node.repo === 'com.enonic.cms.default';
    });
    if (cmsNodesChanged.length === 0) return;

    // save last node event time
    lastUpdate = Date.now();
    // add node ids to next check
    toCheckOnNext = toCheckOnNext.concat(
        cmsNodesChanged.map((node) => {
            return node.id;
        })
    );

    toCheckOnNext = removeDuplicates(toCheckOnNext);

    // run task to check for facet update after 5 seconds after last update
    if (!currentTask) {
        currentTask = taskLib.executeFunction({
            description: 'facet task',
            func: () => {
                taskLib.sleep(debounceTime);
                while (Date.now() - lastUpdate < debounceTime) {
                    taskLib.sleep(500);
                }
                currentTask = null;
                const toCheckOn = toCheckOnNext;
                toCheckOnNext = [];
                checkIfUpdateNeeded(toCheckOn);
            },
        });
    } else {
        logger.info(`${currentTask} is blocking the new execution`);
    }
};

export const activateFacetsEventListener = () => {
    eventLib.listener({
        type: 'node.pushed',
        callback: (event) => {
            if (clusterLib.isMaster()) {
                contextLib.run(
                    {
                        repository: 'com.enonic.cms.default',
                        branch: 'draft',
                        user: {
                            login: 'su',
                            idProvider: 'system',
                        },
                        principals: ['role:system.admin'],
                    },
                    () => {
                        facetHandler(event);
                    }
                );
            }
        },
        localOnly: false,
    });
    logger.info('Started: facet-handler listening on node.pushed');
};
