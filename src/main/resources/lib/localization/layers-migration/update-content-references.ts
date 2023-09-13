import * as contentLib from '/lib/xp/content';
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
import { runInContext } from '../../context/run-in-context';

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

            const oldAudience = contentWithUpdates.data?.audience;
            if (typeof oldAudience === 'string') {
                contentWithUpdates.data.audience = { _selected: oldAudience };
            }

            return contentWithUpdates;
        },
    });

    if (targetBranch === 'draft') {
        return true;
    }

    const publishResult = runInContext({ asAdmin: true, branch: 'draft', repository: repoId }, () =>
        contentLib.publish({
            keys: [contentNodeToUpdateId],
            includeDependencies: false,
        })
    );

    publishResult.failedContents.forEach((contentId) =>
        logger.error(`Publishing ${contentId} failed`)
    );
    publishResult.pushedContents.forEach((contentId) => logger.error(`Published ${contentId}`));
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
