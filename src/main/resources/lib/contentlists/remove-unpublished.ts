import contentLib, { Content } from '/lib/xp/content';
import eventLib from '/lib/xp/event';
import { runInBranchContext } from '../utils/branch-context';
import { forceArray } from '../utils/nav-utils';
import { isPrepublished } from '../siteCache/scheduled-publish';

const isPublishedOrPrepublished = (contentId: string) => {
    const masterContent = runInBranchContext(() => contentLib.get({ key: contentId }), 'master');
    if (masterContent) {
        return true;
    }

    const draftContent = runInBranchContext(() => contentLib.get({ key: contentId }), 'draft');
    return isPrepublished(draftContent?.publish?.from);
};

export const removeUnpublishedFromContentList = (
    contentList: Content<'no.nav.navno:content-list'>
): number => {
    let numRemoved = 0;

    runInBranchContext(
        () =>
            contentLib.modify<'no.nav.navno:content-list'>({
                key: contentList._id,
                editor: (content) => {
                    const sectionContents = forceArray(content.data?.sectionContents);

                    if (sectionContents.length === 0) {
                        return content;
                    }

                    content.data.sectionContents = sectionContents.filter((sectionContentId) => {
                        const shouldKeep = isPublishedOrPrepublished(sectionContentId);

                        if (!shouldKeep) {
                            log.info(
                                `Removing unpublished or deleted content ${sectionContentId} from ${content._path}`
                            );
                            numRemoved++;
                        }

                        return shouldKeep;
                    });

                    return content;
                },
            }),
        'draft'
    );

    return numRemoved;
};

export const removeUnpublishedFromAllContentLists = () => {
    const contentLists = runInBranchContext(
        () =>
            contentLib.query({
                count: 10000,
                contentTypes: ['no.nav.navno:content-list'],
            }),
        'draft'
    ).hits;

    const numRemovedArray = contentLists.map(removeUnpublishedFromContentList);

    log.info(
        `Removed ${numRemovedArray.reduce((acc, item) => acc + item)} unpublished content from ${
            numRemovedArray.length
        } content lists`
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
        'draft'
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
            event.data.nodes.forEach((node) => {
                removeUnpublishedContentFromContentLists(node.id);
            });
        },
    });
};
