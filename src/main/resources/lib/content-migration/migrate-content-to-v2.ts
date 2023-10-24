import * as nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';

import { getRepoConnection } from '../utils/repo-utils';

import {
    contentTypesToMigrate,
    contentTypesToNewVersionMap,
    keysToMigrate,
} from './migration-config';
import { RepoBranch } from 'types/common';
import { getLayersData } from '../localization/layers-data';
import { CONTENT_ROOT_REPO_ID } from '../constants';

// OK 1. change content type for draftContent
// OK 2. if not work in progress, change content type for masterContent.
// OK 3. repeat for all other layers
// OK 4. remove migrated meta data
// 4. Add callback to weave in metadata from PageMeta

const getConnection = (branch: RepoBranch, repoId?: string) => {
    return getRepoConnection({
        repoId: repoId || CONTENT_ROOT_REPO_ID,
        branch,
        asAdmin: true,
    });
};

const buildDataForMigratedContent = (content: Content) => {
    const keysToRemove = keysToMigrate[content.type];
    const newData = { ...content.data };

    keysToRemove.forEach((key) => {
        delete newData[key];
    });

    return newData;
};

const migrateContentToNewVersion = ({
    content,
    newType,
    connection,
    dryRun = true,
}: {
    content: Content;
    newType: string;
    connection: nodeLib.RepoConnection;
    dryRun?: boolean;
}) => {
    log.info(`Migrating content: ${content._id} - ${content.displayName}`);

    const remainingDataAfterMigration = buildDataForMigratedContent(content);

    log.info(`Remaining data: ${JSON.stringify(remainingDataAfterMigration)}`);

    if (dryRun) {
        return;
    }

    connection.modify({
        key: content._id,
        editor: function (node) {
            node.type = newType;
            return node;
        },
    });
};

const processSingleContent = ({
    draftConnection,
    masterConnection,
    draftContent,
    masterContent,
}: {
    draftConnection: nodeLib.RepoConnection;
    masterConnection: nodeLib.RepoConnection;
    draftContent: Content | null;
    masterContent?: Content | null;
}) => {
    if (!draftContent) {
        log.error(`No draft content given: ${draftContent}`);
        return;
    }

    log.info(`Processing content: ${draftContent._id}: ${draftContent.displayName}`);

    // Don't make changes to master content it the draft content is work in progress.
    const isWorkInProgress = draftContent._versionKey !== masterContent?._versionKey;
    const newVersionType = contentTypesToNewVersionMap[draftContent.type];

    migrateContentToNewVersion({
        content: draftContent,
        newType: newVersionType,
        connection: draftConnection,
    });

    if (masterContent && !isWorkInProgress) {
        migrateContentToNewVersion({
            content: masterContent,
            newType: newVersionType,
            connection: masterConnection,
        });
    }
};

const migrateContentInRepo = (repoId: string) => {
    log.info(`Migrating content for repo: ${repoId}`);
    log.info('------------------------------------------');

    const masterConnection = getConnection('master', repoId);
    const draftConnection = getConnection('draft', repoId);

    contentTypesToMigrate.forEach((contentType) => {
        const content = draftConnection.query({ query: `type = '${contentType}'`, count: 2000 });

        // Migrate content for default repo
        content.hits.forEach((content) => {
            const draftContent = draftConnection.get<Content>(content.id);
            const masterContent = masterConnection.get<Content>(content.id);

            processSingleContent({
                draftContent,
                masterContent,
                draftConnection,
                masterConnection,
            });
        });
    });
};

export const migrateContentToV2 = () => {
    log.info('Starting content version migration');
    const { repoIdToLocaleMap } = getLayersData();
    const repos = Object.keys(repoIdToLocaleMap);

    repos.forEach((repoId) => {
        migrateContentInRepo(repoId);
    });
};
