import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';

import { getRepoConnection } from '../utils/repo-utils';

import { contentTypesToMigrate, contentTypesToNewVersionMap } from './migration-config';
import { RepoBranch } from 'types/common';
import { getLayersData } from '../localization/layers-data';
import { CONTENT_ROOT_REPO_ID } from '../constants';

// OK 1. change content type for draftContent
// OK 2. if not work in progress, change content type for masterContent.
// OK 3. repeat for all other layers
// 4. Add callback to weave in metadata from PageMeta
// 5. remove meta data

const getConnection = (branch: RepoBranch, repoId?: string) => {
    return getRepoConnection({
        repoId: repoId || CONTENT_ROOT_REPO_ID,
        branch,
        asAdmin: true,
    });
};

const migrateContentToNewVersion = ({
    content,
    newType,
    connection,
}: {
    content: Content;
    newType: string;
    connection: nodeLib.RepoConnection;
}) => {
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
    if (draftContent?._id !== '75425131-068a-45cd-bd4a-415fe5c61b5f') {
        return;
    }
    log.info(`Processing content: ${draftContent._id}: ${draftContent.displayName}`);

    if (!draftContent) {
        log.error(`No draft content given: ${draftContent}`);
        return;
    }

    // Don't make changes to master content it the draft content is work in progress.
    const isWorkInProgress = draftContent._versionKey !== masterContent?._versionKey;
    const newVersionType = contentTypesToNewVersionMap[draftContent.type];

    migrateContentToNewVersion({
        content: draftContent,
        newType: newVersionType,
        connection: draftConnection,
    });

    if (!isWorkInProgress) {
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
