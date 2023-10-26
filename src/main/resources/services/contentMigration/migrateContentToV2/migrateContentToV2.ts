import * as nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';

import { getRepoConnection } from '../../../lib/utils/repo-utils';

import {
    ParamType,
    contentTypesToMigrate,
    contentTypesToNewVersionMap,
    keysToMigrate,
} from '../migration-config';
import { RepoBranch } from 'types/common';
import { getLayersData } from '../../../lib/localization/layers-data';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';

// OK 1. change content type for draftContent
// OK 2. if not work in progress, change content type for masterContent.
// OK 3. repeat for all other layers
// OK 4. remove migrated meta data
// OK 5. Add callback to weave in metadata from PageMeta
// 6. Remove xml data from content definitions.
// OK: 7. Add schema creation

const getConnection = (branch: RepoBranch, repoId?: string) => {
    return getRepoConnection({
        repoId: repoId || CONTENT_ROOT_REPO_ID,
        branch,
        asAdmin: true,
    });
};

const buildDataForMigratedContent = (content: Content, pageMetaId: string) => {
    const keysToRemove = keysToMigrate[content.type];
    const newData = { ...content.data, pageMeta: pageMetaId };

    keysToRemove.forEach((key) => {
        delete newData[key];
    });

    return newData;
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
    log.info(`Migrating content: ${content._id} - ${content.displayName}`);

    const pageMeta = connection.query({
        query: `data.targetId = '${content._id}' AND type = 'no.nav.navno:page-meta'`,
    }).hits?.[0];

    if (!pageMeta) {
        log.error(`No page meta found for content ${content._id}`);
        return;
    }

    const remainingDataAfterMigration = buildDataForMigratedContent(content, pageMeta.id);

    connection.modify({
        key: content._id,
        editor: function (node) {
            node.type = newType;
            node.data = remainingDataAfterMigration;
            return node;
        },
    });
};

const processSingleContent = ({
    connection,
    draftContent,
    masterContent,
}: {
    connection: nodeLib.RepoConnection;
    draftContent: Content | null;
    masterContent?: Content | null;
}) => {
    if (!draftContent) {
        log.error(`No draft content given: ${draftContent}`);
        return;
    }

    if (draftContent._id !== 'd3af7782-24c6-4336-bb15-07563cb7136d') {
        return null;
    }

    // Don't make changes to master content it the draft content is work in progress.
    const isWorkInProgress = draftContent._versionKey !== masterContent?._versionKey;
    const newType = contentTypesToNewVersionMap[draftContent.type];

    migrateContentToNewVersion({
        content: draftContent,
        newType,
        connection,
    });

    if (masterContent && !isWorkInProgress) {
        return draftContent._id;
    }

    return null;
};

const migrateContentInRepo = (repoId: string, typeToMigrate: string) => {
    log.info('------------------------------------------');
    log.info(`Migrating content for repo: ${repoId}`);
    log.info('------------------------------------------');

    const masterConnection = getConnection('master', repoId);
    const draftConnection = getConnection('draft', repoId);

    // Todo: Migrate by content type from request arguments
    contentTypesToMigrate.forEach((contentType) => {
        if (typeToMigrate && typeToMigrate !== contentType) {
            log.info(`Skipping content type: ${contentType}`);
            return;
        }

        const content = draftConnection.query({ query: `type = '${contentType}'`, count: 2000 });
        const idsToPublish: string[] = [];

        // Migrate content for default repo
        content.hits.forEach((content) => {
            const draftContent = draftConnection.get<Content>(content.id);
            const masterContent = masterConnection.get<Content>(content.id);

            const id = processSingleContent({
                draftContent,
                masterContent,
                connection: draftConnection,
            });
            if (id) {
                idsToPublish.push(id);
            }
        });
        const pushResult = draftConnection.push({
            keys: [...idsToPublish],
            target: 'master',
            resolve: false,
        });
        log.info('------------------------------------------');
        log.info(`Published the following ids: ${JSON.stringify(idsToPublish)}`);
        log.info(`Push result for ${contentType}: ${JSON.stringify(pushResult)}`);
        log.info('------------------------------------------');
    });
};

export const migrateContentToV2 = (param: ParamType) => {
    const { repoIdToLocaleMap } = getLayersData();
    const repos = Object.keys(repoIdToLocaleMap);

    const { typeToMigrate } = param;

    repos.forEach((repoId) => {
        migrateContentInRepo(repoId, typeToMigrate);
    });
};
