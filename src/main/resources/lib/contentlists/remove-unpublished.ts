import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
import { Content } from '/lib/xp/content';
import * as eventLib from '/lib/xp/event';
import { runInContext } from '../context/run-in-context';
import { isContentAwaitingPrepublish } from '../utils/content-utils';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { CONTENT_REPO_PREFIX } from '../constants';
import { NavNoDescriptor } from '../../types/common';
import { isMainDatanode } from '../cluster-utils/main-datanode';
import { getRepoConnection, isDraftAndMasterSameVersion } from '../repos/repo-utils';

type ContentTypesWithContentLists = NavNoDescriptor<'content-list'> | NavNoDescriptor<'page-list'>;

export const CONTENT_TYPES_WITH_CONTENT_LISTS: ContentTypesWithContentLists[] = [
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
        if (!draftContent) {
            return false;
        }

        return isContentAwaitingPrepublish(draftContent);
    } catch (e) {
        logger.error(
            `Error getting publish state for ${contentId}, assuming content is corrupted and returning false - ${e}`
        );
        return false;
    }
};

type ContentListResult = {
    numRemoved: number;
    error?: string;
};

const removeUnpublishedFromContentList = (
    contentList: Content<ContentTypesWithContentLists>
): ContentListResult => {
    try {
        return runInContext({ branch: 'draft', asAdmin: true }, () => {
            const repoId = contextLib.get().repository;
            const repoConnection = getRepoConnection({
                branch: 'draft',
                repoId,
            });

            const draftContentList = repoConnection.get<Content<ContentTypesWithContentLists>>(
                contentList._id
            );
            const sectionContents = forceArray(draftContentList?.data?.sectionContents);

            // Resolved before modify, as XP 8 runs the editor in the node connection's context, and
            // switching context inside the editor made the following update run without admin access
            const idsToRemove = sectionContents
                .map(String)
                .filter((sectionContentId) => !isPublishedOrPrepublished(sectionContentId));

            if (idsToRemove.length === 0) {
                return { numRemoved: 0 };
            }

            idsToRemove.forEach((sectionContentId) => {
                logger.info(
                    `Removing unpublished or deleted content ${sectionContentId} from ${contentList._path}`
                );
            });

            const shouldPushChanges = isDraftAndMasterSameVersion(contentList._id, repoId);

            repoConnection.modify<Content>({
                key: contentList._id,
                editor: (content) => {
                    // Filtering the existing values keeps their Reference type
                    content.data.sectionContents = forceArray(
                        content.data?.sectionContents
                    ).filter(
                        (sectionContentId) => !idsToRemove.includes(String(sectionContentId))
                    );

                    return content;
                },
            });

            if (shouldPushChanges) {
                repoConnection.commit({ keys: contentList._id });
                repoConnection.push({
                    key: contentList._id,
                    target: 'master',
                    includeChildren: false,
                    resolve: false,
                });
            } else {
                logger.info(
                    `Removed unpublished content from content list ${contentList._id}, but draft and master are out of sync, so not pushing changes.`
                );
            }

            return { numRemoved: idsToRemove.length };
        });
    } catch (e) {
        logger.error(`Error while modifying ${contentList._id} - ${e}`);
        return { numRemoved: 0, error: String(e) };
    }
};

export const removeUnpublishedFromAllContentLists = () => {
    const contentLists = runInContext({ branch: 'master' }, () =>
        contentLib.query({
            count: 2000,
            contentTypes: CONTENT_TYPES_WITH_CONTENT_LISTS,
        })
    ).hits;

    logger.info(`Pruning ${contentLists.length} content lists`);

    let numRemovedItems = 0;
    const changedContentLists: string[] = [];
    const failedContentLists: { path: string; error: string }[] = [];

    contentLists.forEach((contentList) => {
        const { numRemoved, error } = removeUnpublishedFromContentList(contentList);

        if (error) {
            failedContentLists.push({ path: contentList._path, error });
        } else if (numRemoved > 0) {
            numRemovedItems += numRemoved;
            changedContentLists.push(contentList._path);
        }
    });

    logger.info(
        `Removed ${numRemovedItems} unpublished content from ${changedContentLists.length} contents with content lists`
    );

    return {
        contentListsChecked: contentLists.length,
        itemsRemoved: numRemovedItems,
        changedContentLists,
        failedContentLists,
    };
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
            if (!isMainDatanode()) {
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
