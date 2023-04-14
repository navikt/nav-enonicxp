import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { runInContext } from '../context/run-in-context';
import { isPrepublished } from '../scheduling/scheduled-publish';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { CONTENT_REPO_PREFIX } from '../constants';
import { NavNoDescriptor } from '../../types/common';

type ContentTypesWithContentLists = NavNoDescriptor<'content-list'> | NavNoDescriptor<'page-list'>;

const CONTENT_TYPES_WITH_CONTENT_LISTS: ContentTypesWithContentLists[] = [
    'no.nav.navno:content-list',
    'no.nav.navno:page-list',
];

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
    contentList: Content<ContentTypesWithContentLists>
): number => {
    let numRemoved = 0;

    try {
        runInContext({ branch: 'draft', asAdmin: true }, () =>
            contentLib.modify<ContentTypesWithContentLists>({
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
        logger.error(`Error while modifying ${contentList._id} - ${e}`);
        return 0;
    }

    return numRemoved;
};

export const removeUnpublishedFromAllContentLists = () => {
    const contentLists = runInContext({ branch: 'master' }, () =>
        contentLib.query({
            count: 2000,
            contentTypes: CONTENT_TYPES_WITH_CONTENT_LISTS,
        })
    ).hits;

    logger.info(`Pruning ${contentLists.length} content lists`);

    const numContentsWithRemovedItems = contentLists
        .map(removeUnpublishedFromContentList)
        .filter((item) => item !== 0);
    const numRemovedItems = numContentsWithRemovedItems.reduce((acc, item) => acc + item, 0);

    logger.info(
        `Removed ${numRemovedItems} unpublished content from ${numContentsWithRemovedItems.length} contents with content lists`
    );
};

const removeUnpublishedContentFromContentLists = (contentId: string, repoId: string) => {
    runInContext({ branch: 'master', repository: repoId }, () =>
        contentLib
            .query({
                count: 2000,
                contentTypes: CONTENT_TYPES_WITH_CONTENT_LISTS,
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
            .hits.forEach(removeUnpublishedFromContentList)
    );
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
                if (!node.repo.startsWith(CONTENT_REPO_PREFIX)) {
                    return;
                }

                removeUnpublishedContentFromContentLists(node.id, node.repo);
            });
        },
    });
};
