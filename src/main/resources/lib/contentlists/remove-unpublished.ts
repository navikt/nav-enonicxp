import contentLib, { Content } from '/lib/xp/content';
import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { runInBranchContext } from '../utils/branch-context';
import { forceArray } from '../utils/nav-utils';
import { isPrepublished } from '../scheduling/scheduled-publish';
import { logger } from '../utils/logging';

const isPublishedOrPrepublished = (contentId: string) => {
    try {
        const masterContent = runInBranchContext(
            () => contentLib.get({ key: contentId }),
            'master'
        );
        if (masterContent) {
            return true;
        }

        const draftContent = runInBranchContext(() => contentLib.get({ key: contentId }), 'draft');
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
        runInBranchContext(
            () =>
                contentLib.modify<'no.nav.navno:content-list'>({
                    key: contentList._id,
                    requireValid: false,
                    editor: (content) => {
                        const sectionContents = forceArray(content.data?.sectionContents);

                        if (sectionContents.length === 0) {
                            return content;
                        }

                        content.data.sectionContents = sectionContents.filter(
                            (sectionContentId) => {
                                const shouldKeep = isPublishedOrPrepublished(sectionContentId);

                                if (!shouldKeep) {
                                    logger.info(
                                        `Removing unpublished or deleted content ${sectionContentId} from ${content._path}`
                                    );
                                    numRemoved++;
                                }

                                return shouldKeep;
                            }
                        );

                        return content;
                    },
                }),
            'draft'
        );
    } catch (e) {
        logger.error(`Error while modifying content list ${contentList._id} - ${e}`);
        return 0;
    }

    return numRemoved;
};

export const removeUnpublishedFromAllContentLists = () => {
    const contentLists = runInBranchContext(
        () =>
            contentLib.query({
                count: 10000,
                contentTypes: ['no.nav.navno:content-list'],
            }),
        'master'
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
    runInBranchContext(
        () =>
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
            }),
        'master'
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
