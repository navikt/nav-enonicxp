import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { runInContext } from '../context/run-in-context';
import { isPrepublished } from '../scheduling/scheduled-publish';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';

const isPublishedOrPrepublished = (contentId: string) => {
    try {
        const masterContent = runInContext({ branch: 'master' }, () =>
            contentLib.get({ key: contentId })
        );
        if (masterContent) {
            return true;
        }

        const draftContent = runInContext({ branch: 'draft' }, () =>
            contentLib.get({ key: contentId })
        );
        return isPrepublished(draftContent?.publish?.from);
    } catch (e) {
        logger.error(
            `Error getting publish state for ${contentId}, assuming content is corrupted and returning false - ${e}`
        );
        return false;
    }
};

export const removeUnpublishedFromContentList = (
    contentList: Content<'no.nav.navno:content-list'>
): number => {
    let numRemoved = 0;

    try {
        runInContext({ branch: 'draft', asAdmin: true }, () =>
            contentLib.modify<'no.nav.navno:content-list'>({
                key: contentList._id,
                requireValid: false,
                editor: (content) => {
                    const sectionContents = forceArray(content.data?.sectionContents);

                    if (sectionContents.length === 0) {
                        return content;
                    }

                    content.data.sectionContents = sectionContents.filter((sectionContentId) => {
                        const shouldKeep = isPublishedOrPrepublished(sectionContentId);

                        if (!shouldKeep) {
                            logger.info(
                                `Removing unpublished or deleted content ${sectionContentId} from ${content._path}`
                            );
                            numRemoved++;
                        }

                        return shouldKeep;
                    });

                    return content;
                },
            })
        );
    } catch (e) {
        logger.error(`Error while modifying content list ${contentList._id} - ${e}`);
        return 0;
    }

    return numRemoved;
};

export const removeUnpublishedFromAllContentLists = () => {
    const contentLists = runInContext({ branch: 'master' }, () =>
        contentLib.query({
            count: 10000,
            contentTypes: ['no.nav.navno:content-list'],
        })
    ).hits;

    logger.info(`Pruning ${contentLists.length} content-lists`);

    const numRemovedArray = contentLists
        .map(removeUnpublishedFromContentList)
        .filter((item) => item !== 0);
    const numRemoved = numRemovedArray.reduce((acc, item) => acc + item);

    logger.info(
        `Removed ${numRemoved} unpublished content from ${numRemovedArray.length} content-lists`
    );
};

const removeUnpublishedContentFromContentLists = (contentId: string) => {
    runInContext({ branch: 'master' }, () =>
        contentLib.query({
            count: 10000,
            contentTypes: ['no.nav.navno:content-list'],
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'data.sectionContents',
                            values: [contentId],
                        },
                    },
                },
            },
        })
    ).hits.forEach(removeUnpublishedFromContentList);
};

let didActivateListener = false;

export const activateContentListItemUnpublishedListener = () => {
    if (didActivateListener) {
        return;
    }

    didActivateListener = true;

    eventLib.listener({
        type: 'node.deleted',
        callback: (event) => {
            if (!clusterLib.isMaster()) {
                return;
            }

            event.data.nodes.forEach((node) => {
                removeUnpublishedContentFromContentLists(node.id);
            });
        },
    });
};
