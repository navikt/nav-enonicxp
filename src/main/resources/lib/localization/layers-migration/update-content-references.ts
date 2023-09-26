import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { ContentMigrationParams } from './migrate-content-to-layer';
import { getRepoConnection, isDraftAndMasterSameVersion } from '../../utils/repo-utils';
import { getLayersData } from '../layers-data';
import { RepoBranch } from '../../../types/common';
import { modifyContentNode } from './modify-content-node';
import { forceArray } from '../../utils/array-utils';
import { isContentLocalized } from '../locale-utils';
import { ContentReferencesFinder } from '../../cache/content-references-finder';

const updateReferenceFromNode = ({
    contentNodeToUpdate,
    newRefId,
    prevRefId,
    repoId,
    targetBranch,
}: {
    contentNodeToUpdate: RepoNode<Content>;
    prevRefId: string;
    newRefId: string;
    repoId: string;
    targetBranch: RepoBranch;
}) => {
    const contentJson = JSON.stringify(contentNodeToUpdate);
    if (!contentJson.includes(prevRefId)) {
        logger.info(
            `No reference to previous ref id ${prevRefId} found in ${contentNodeToUpdate._path}, skipping`
        );
        return;
    }

    const { _id: contentNodeToUpdateId } = contentNodeToUpdate;

    modifyContentNode({
        key: contentNodeToUpdateId,
        repoId,
        requireValid: false,
        editor: () => {
            const contentJsonWithUpdates = contentJson.replace(
                new RegExp(prevRefId, 'g'),
                newRefId
            );
            const contentWithUpdates = JSON.parse(contentJsonWithUpdates);

            // If the content referenced the migrated content in the legacy languages list
            // it might now be referencing itself instead. Ensure such a reference is removed.
            if (contentWithUpdates.data?.languages) {
                const languages = forceArray(contentWithUpdates.data.languages);
                contentWithUpdates.data.languages = languages.filter(
                    (language) => language !== contentNodeToUpdateId
                );
            }

            return contentWithUpdates;
        },
    });

    if (targetBranch === 'draft') {
        return true;
    }

    const repoConnection = getRepoConnection({
        branch: 'draft',
        repoId,
        asAdmin: true,
    });

    const pushResult = repoConnection.push({
        key: contentNodeToUpdateId,
        target: 'master',
        resolve: false,
        includeChildren: false,
    });

    pushResult.failed.forEach(({ id, reason }) =>
        logger.error(`Pushing ${id} to master failed: ${reason}`)
    );
    pushResult.success.forEach((id) => logger.info(`Pushing ${id} to master succeeded`));
};

const updateContentReferencesInLocaleLayer = (
    { sourceId, targetId, sourceLocale }: ContentMigrationParams,
    localeToUpdate: string
) => {
    const repoToUpdate = getLayersData().localeToRepoIdMap[localeToUpdate];
    if (!repoToUpdate) {
        logger.error(`No repo found for locale "${localeToUpdate}"`);
        return;
    }

    const contentReferencesFinder = new ContentReferencesFinder({
        contentId: sourceId,
        repoId: repoToUpdate,
        branch: 'master',
        withDeepSearch: false,
    });

    const references = contentReferencesFinder.run();
    if (!references) {
        logger.error(`References search failed for ${sourceId} in locale ${localeToUpdate}`);
        return false;
    }

    logger.info(
        `Found ${
            references.length
        } references to ${sourceId} in locale ${localeToUpdate}: ${references
            .map((ref) => ref._id)
            .join(', ')}`
    );

    references.forEach((refContent) => {
        if (!isContentLocalized(refContent)) {
            return;
        }

        const refContentId = refContent._id;
        if (refContentId === sourceId && localeToUpdate === sourceLocale) {
            return;
        }

        const contentNodeMaster = getRepoConnection({
            branch: 'master',
            repoId: repoToUpdate,
            asAdmin: true,
        }).get(refContentId);

        // Get the content node from draft before updating master, as it may be overwritten
        const contentNodeDraft = getRepoConnection({
            branch: 'draft',
            repoId: repoToUpdate,
            asAdmin: true,
        }).get(refContentId);

        if (contentNodeMaster) {
            updateReferenceFromNode({
                contentNodeToUpdate: contentNodeMaster,
                prevRefId: sourceId,
                newRefId: targetId,
                repoId: repoToUpdate,
                targetBranch: 'master',
            });
        }

        // If the draft version is not the same as master, we need to update draft as well
        if (contentNodeDraft && !isDraftAndMasterSameVersion(refContent._id, repoToUpdate)) {
            updateReferenceFromNode({
                contentNodeToUpdate: contentNodeDraft,
                prevRefId: sourceId,
                newRefId: targetId,
                repoId: repoToUpdate,
                targetBranch: 'draft',
            });
        }
    });

    return true;
};

export const updateContentReferences = (params: ContentMigrationParams) => {
    const { locales } = getLayersData();

    let isSuccess = true;

    locales.forEach((locale) => {
        const result = updateContentReferencesInLocaleLayer(params, locale);
        if (!result) {
            isSuccess = false;
        }
    });

    return isSuccess;
};
