import { getLayersData } from '../layers-data';
import { getRepoConnection } from '../../utils/repo-connection';
import { logger } from '../../utils/logging';
import { RepoBranch } from '../../../types/common';
import { CONTENT_REPO_PREFIX } from '../../constants';
import * as valueLib from '/lib/xp/value';
import { RepoConnection } from '/lib/xp/node';
import { forceArray } from '../../utils/array-utils';

type ContentMigrationParams = {
    sourceContentId: string;
    sourceLocale: string;
    targetContentId: string;
    targetLocale: string;
};

const getProjectIdFromLocale = (locale: string) => {
    const { localeToRepoIdMap } = getLayersData();

    return localeToRepoIdMap[locale].replace(`${CONTENT_REPO_PREFIX}.`, '');
};

const prepareGetParams = (keys: string | string[], bean: any) => {
    forceArray(keys).forEach((param: any) => {
        bean.add(param);
    });
};

const testJavaGet = (repoConnection: RepoConnection, keys: string | string[]) => {
    const handlerParams = __.newBean('com.enonic.xp.lib.node.GetNodeHandlerParams');

    prepareGetParams(keys, handlerParams);

    // @ts-ignore
    logger.info(`nodeHandler: ${typeof repoConnection.nodeHandler}`);
    // @ts-ignore
    return __.toNativeObject(repoConnection.nodeHandler.get(handlerParams));
};

const transformToLayerContent = (content: any, sourceLocale: string, targetLocale: string) => {
    content.originProject = getProjectIdFromLocale(sourceLocale);
    content.inherit = ['PARENT', 'SORT'];
    content.language = targetLocale;
    content.data.languages = valueLib.reference(content.data.languages);

    return content;

    // return {
    //     ...content,
    //     // data: { ...content.data },
    //     originProject: getProjectIdFromLocale(sourceLocale),
    //     inherit: ['PARENT', 'SORT'],
    //     language: targetLocale,
    // };
};

const migrateBranch = (
    { sourceContentId, sourceLocale, targetContentId, targetLocale }: ContentMigrationParams,
    sourceBranch: RepoBranch
) => {
    const { localeToRepoIdMap } = getLayersData();

    const sourceRepo = getRepoConnection({
        branch: sourceBranch,
        repoId: localeToRepoIdMap[sourceLocale],
        asAdmin: true,
    });

    const targetDraftRepo = getRepoConnection({
        branch: 'draft',
        repoId: localeToRepoIdMap[targetLocale],
        asAdmin: true,
    });

    const sourceContent = sourceRepo.get(sourceContentId);
    if (!sourceContent) {
        logger.error(`Content not found for source id ${sourceContentId}`);
        return null;
    }

    const javaContent = testJavaGet(sourceRepo, sourceContentId);
    logger.info(`Java content: ${JSON.stringify(javaContent)}`);

    const targetContent = targetDraftRepo.get(targetContentId);
    if (!targetContent) {
        logger.error(`Content not found for target id ${sourceContentId}`);
        return null;
    }

    const sourceLogString = `[${sourceLocale}] ${sourceContent._path}`;
    const targetLogString = `[${targetLocale}] ${targetContent._path}`;

    const modifyResult = targetDraftRepo.modify({
        key: targetContentId,
        editor: (_) => {
            logger.info(`Copying content from ${sourceLogString} to ${targetLogString}`);

            return transformToLayerContent(javaContent, sourceLocale, targetLocale);
        },
    });

    if (!modifyResult) {
        logger.error(
            `Failed to modify target content ${targetLogString} with source content ${sourceLogString}`
        );
        return null;
    }

    targetDraftRepo.refresh();

    if (sourceBranch === 'master') {
        const pushResult = targetDraftRepo.push({
            key: targetContentId,
            target: 'master',
            resolve: false,
        });
        pushResult.failed.forEach(({ id, reason }) => `Pushing ${id} to master failed: ${reason}`);
        pushResult.success.forEach((id) => `Pushing ${id} to master succeeded`);
    }

    return 'Great success!';
};

export const migrateRootContentToLayer = (contentMigrationParams: ContentMigrationParams) => {
    migrateBranch(contentMigrationParams, 'master');
    migrateBranch(contentMigrationParams, 'draft');

    return 'Great success!';
};
