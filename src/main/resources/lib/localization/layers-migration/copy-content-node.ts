import * as contentLib from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { getContentProjectIdFromRepoId, getRepoConnection } from '../../utils/repo-utils';
import { RepoBranch } from '../../../types/common';
import { getLayersData } from '../layers-data';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { COMPONENT_APP_KEY } from '../../constants';
import { generateLayerMigrationData } from './migration-data';

export type CopyContentNodeDataParams = {
    sourceId: string;
    sourceLocale: string;
    targetId: string;
    targetLocale: string;
    branch: RepoBranch;
};

export const copyContentNode = (
    { sourceId, sourceLocale, targetId, targetLocale, branch }: CopyContentNodeDataParams,
    editorFunc: <Type = unknown>(content?: Type) => Type
) => {
    const { localeToRepoIdMap } = getLayersData();

    const targetRepoDraft = getRepoConnection({
        branch,
        repoId: localeToRepoIdMap[targetLocale],
        asAdmin: true,
    });

    const sourceLogString = `[${sourceLocale}] ${sourceId}`;
    const targetLogString = `[${targetLocale}] ${targetId}`;

    // We need to modify the content in two stages to get a valid result. First do a complete copy of
    // the content node from the source to the target, using the node library. This includes every field
    // of the node object, including the complete components array.
    // However, this does not preserve spesial string field types, such as Reference or Datetime.
    // These will be indexed as plain strings on the target node.
    const nodeModifyResult = targetRepoDraft.modify({
        key: targetId,
        editor: editorFunc,
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
        { locale: targetLocale, asAdmin: true, branch },
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
};
