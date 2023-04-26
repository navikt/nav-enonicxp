import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { findReferences } from '../../cache/find-references';
import { logger } from '../../utils/logging';
import { ContentMigrationParams } from './migrate-content-to-layer';
import { runInLocaleContext } from '../locale-context';
import { getRepoConnection, isDraftAndMasterSameVersion } from '../../utils/repo-utils';
import { getLayersData } from '../layers-data';
import { RepoBranch } from '../../../types/common';
import { modifyContentNode } from './modify-content-node';
import { forceArray } from '../../utils/array-utils';
import { isContentLocalized } from '../locale-utils';

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

    pushResult.failed.forEach(({ id, reason }) => `Pushing ${id} to master failed: ${reason}`);
    pushResult.success.forEach((id) => `Pushing ${id} to master succeeded`);
};

const updateContentReferencesInLocaleLayer = (
    { sourceId, targetId, sourceLocale }: ContentMigrationParams,
    localeToUpdate: string
) => {
    const sourceRepoId = getLayersData().localeToRepoIdMap[localeToUpdate];
    if (!sourceRepoId) {
        logger.error(`Invalid locale specified ${localeToUpdate}`);
        return;
    }

    const references = runInLocaleContext({ locale: localeToUpdate }, () =>
        findReferences({ id: sourceId, branch: 'master', withDeepSearch: false })
    );
    if (!references) {
        logger.error(`References search failed for ${sourceId} in locale ${localeToUpdate}`);
        return false;
    }

    logger.info(
        `Found ${
            references.length
        } references to ${sourceId} in locale ${localeToUpdate}:\n${references
            .map((ref) => ref._path)
            .join('\n')}`
    );

    references.forEach((refContent) => {
        if (!isContentLocalized(refContent)) {
            return;
        }

        const { _id } = refContent;
        if (_id === sourceId && localeToUpdate === sourceLocale) {
            return;
        }

        const contentNodeMaster = getRepoConnection({
            branch: 'master',
            repoId: sourceRepoId,
            asAdmin: true,
        }).get(_id);

        // Get the content node from draft before updating master, as it may be overwritten
        const contentNodeDraft = getRepoConnection({
            branch: 'draft',
            repoId: sourceRepoId,
            asAdmin: true,
        }).get(_id);

        if (contentNodeMaster) {
            updateReferenceFromNode({
                contentNodeToUpdate: contentNodeMaster,
                prevRefId: sourceId,
                newRefId: targetId,
                repoId: sourceRepoId,
                targetBranch: 'master',
            });
        }

        // If the draft version was not committed to master, we need to update this as well
        if (contentNodeDraft && !isDraftAndMasterSameVersion(refContent._id, sourceRepoId)) {
            updateReferenceFromNode({
                contentNodeToUpdate: contentNodeDraft,
                prevRefId: sourceId,
                newRefId: targetId,
                repoId: sourceRepoId,
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
