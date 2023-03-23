import { findReferences } from '../../cache/find-references';
import { logger } from '../../utils/logging';
import { ContentMigrationParams } from './migrate-content-to-layer';
import { runInLocaleContext } from '../locale-context';
import { getRepoConnection, isDraftAndMasterSameVersion } from '../../utils/repo-utils';
import { getLayersData } from '../layers-data';
import { RepoBranch } from '../../../types/common';
import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { transformNodeContentToIndexableTypes } from './transform-node-content-to-indexable-types';

const updateReferenceNode = (
    refNode: RepoNode<Content>,
    sourceContentId: string,
    targetContentId: string,
    targetBranch: RepoBranch,
    repoId: string
) => {
    const { _id, _path } = refNode;

    const repoConnection = getRepoConnection({
        branch: targetBranch,
        repoId,
        asAdmin: true,
    });

    const contentJson = JSON.stringify(refNode);

    if (!contentJson.includes(sourceContentId)) {
        logger.info(`Source content id not found in ${_path}, skipping`);
        return;
    }

    repoConnection.modify({
        key: _id,
        editor: (_) => {
            const contentWithReplace = contentJson.replace(
                new RegExp(sourceContentId, 'g'),
                targetContentId
            );

            const newContent = transformNodeContentToIndexableTypes(JSON.parse(contentWithReplace));

            logger.info(`Old: ${contentJson}`);
            logger.info(`New: ${JSON.stringify(newContent)}`);

            return newContent;
        },
    });

    if (targetBranch === 'draft') {
        return true;
    }

    const pushResult = repoConnection.push({
        key: _id,
        target: 'master',
        resolve: false,
    });

    pushResult.failed.forEach(({ id, reason }) => `Pushing ${id} to master failed: ${reason}`);
    pushResult.success.forEach((id) => `Pushing ${id} to master succeeded`);
};

export const updateContentReferences = ({
    sourceContentId,
    sourceLocale,
    targetContentId,
}: ContentMigrationParams) => {
    const references = runInLocaleContext({ locale: sourceLocale }, () =>
        findReferences(sourceContentId, 'master', undefined, false)
    );

    if (!references) {
        return false;
    }

    logger.info(
        `Found ${
            references.length
        } references to ${sourceContentId} in locale ${sourceLocale}:\n${references
            .map((ref) => ref._path)
            .join('\n')}`
    );

    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    const repoConnectionMaster = getRepoConnection({
        branch: 'master',
        repoId: sourceRepoId,
        asAdmin: true,
    });

    const repoConnectionDraft = getRepoConnection({
        branch: 'draft',
        repoId: sourceRepoId,
        asAdmin: true,
    });

    references.forEach((refContent) => {
        const { _id } = refContent;

        if (_id === sourceContentId) {
            return;
        }

        const refNodeMaster = repoConnectionMaster.get(_id);
        const refNodeDraft = repoConnectionDraft.get(_id);

        if (refNodeMaster) {
            updateReferenceNode(
                refNodeMaster,
                sourceContentId,
                targetContentId,
                'master',
                sourceRepoId
            );
        }

        if (refNodeDraft && !isDraftAndMasterSameVersion(refContent._id, sourceRepoId)) {
            updateReferenceNode(
                refNodeDraft,
                sourceContentId,
                targetContentId,
                'draft',
                sourceRepoId
            );
        }
    });

    return true;
};
