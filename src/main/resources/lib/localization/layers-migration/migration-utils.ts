import * as contentLib from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { getContentProjectIdFromRepoId, getRepoConnection } from '../../utils/repo-utils';
import { RepoBranch } from '../../../types/common';
import { getLayersData } from '../layers-data';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { COMPONENT_APP_KEY } from '../../constants';
import { generateLayerMigrationData } from './migration-data';

type CopyContentNodeDataParams = {
    sourceId: string;
    sourceLocale: string;
    targetId: string;
    targetLocale: string;
    branch: RepoBranch;
};

const transformToLayerContent = (
    sourceContent: RepoNode<any>,
    sourceLocale: string,
    targetLocale: string
) => {
    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    // sourceContent.x[COMPONENT_APP_KEY].layerMigration = generateLayerMigrationData({
    //     type: 'live',
    //     contentId: sourceContent._id,
    //     locale: sourceLocale,
    //     repoId: sourceRepoId,
    // });
    // sourceContent.originProject = getContentProjectIdFromRepoId(sourceRepoId);
    // sourceContent.inherit = ['PARENT', 'SORT'];
    // sourceContent.language = targetLocale;
    //
    // return sourceContent;

    return {
        ...sourceContent,
        x: {
            ...sourceContent.x,
            [COMPONENT_APP_KEY]: {
                layerMigration: generateLayerMigrationData({
                    type: 'live',
                    contentId: sourceContent._id,
                    locale: sourceLocale,
                    repoId: sourceRepoId,
                }),
            },
        },
        originProject: getContentProjectIdFromRepoId(sourceRepoId),
        inherit: ['PARENT', 'SORT'],
        language: targetLocale,
    };
};

export const copyContentNode = ({
    sourceId,
    sourceLocale,
    targetId,
    targetLocale,
    branch,
}: CopyContentNodeDataParams) => {
    const { localeToRepoIdMap } = getLayersData();

    const sourceRepo = getRepoConnection({
        branch: branch,
        repoId: localeToRepoIdMap[sourceLocale],
        asAdmin: true,
    });

    const targetRepoDraft = getRepoConnection({
        branch: 'draft',
        repoId: localeToRepoIdMap[targetLocale],
        asAdmin: true,
    });

    const sourceContent = sourceRepo.get(sourceId);
    if (!sourceContent) {
        logger.error(
            `Content not found for source: [${sourceLocale}] ${sourceId} in branch ${branch}`
        );
        return false;
    }

    const targetContent = targetRepoDraft.get(targetId);
    if (!targetContent) {
        logger.error(`Content not found for target: [${targetLocale}] ${targetId}`);
        return false;
    }

    const sourceLogString = `[${sourceLocale}] ${sourceContent._path}`;
    const targetLogString = `[${targetLocale}] ${targetContent._path}`;

    // We need to modify the content in two stages to get a valid result. First do a complete copy of
    // the content node from the source to the target, using the node library. This includes every field
    // of the node object, including the complete components array.
    // However, this does not preserve spesial string field types, such as Reference or Datetime.
    // These will be indexed as plain strings on the target node.
    const nodeModifyResult = targetRepoDraft.modify({
        key: targetId,
        editor: (_) => {
            logger.info(`Copying node content from ${sourceLogString} to ${targetLogString}`);
            return transformToLayerContent(sourceContent, sourceLocale, targetLocale);
        },
    });
    if (!nodeModifyResult) {
        logger.error(
            `Failed to modify target content ${targetLogString} with source content ${sourceLogString} (stage 1)`
        );
        return false;
    }

    // Do a second pass with the content library, where we perform no mutation of the content on our own.
    // The contentLib function will set the correct types on every field, according to the content-type
    // descriptor for the modified content.
    const contentModifyResult = runInLocaleContext(
        { locale: targetLocale, asAdmin: true, branch: 'draft' },
        () =>
            contentLib.modify({
                key: targetId,
                editor: (content) => {
                    logger.info(
                        `Processing node content (${sourceLogString} -> ${targetLogString})`
                    );
                    return content;
                },
            })
    );
    if (!contentModifyResult) {
        logger.error(
            `Failed to modify target content ${targetLogString} with source content ${sourceLogString} (stage 2)`
        );
        return false;
    }

    if (branch !== 'master') {
        return true;
    }

    const pushResult = targetRepoDraft.push({
        key: targetId,
        target: 'master',
        resolve: false,
    });

    pushResult.failed.forEach(({ id, reason }) => `Pushing ${id} to master failed: ${reason}`);
    pushResult.success.forEach((id) => `Pushing ${id} to master succeeded`);

    return pushResult.success.length > 0;
};
