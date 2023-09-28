const nodeLib = require('/lib/xp/node');
import * as contentLib from '/lib/xp/content';
import { runInContext } from '../../lib/context/run-in-context';

import { keysToMigrate, contentTypesToMigrate } from './migration-config';

// Migration
// -----------------
// 1. Doing one content type at a time.
// 2. Find all content in default draft repo (no) for each content type.
// 3. For each found content
// - 3.1 Check if content already has a reference to a meta object
// - 3.2 If not, create a meta object, else stop.
// - 3.3 Extract meta data from content
// - 3.4 Add meta data to meta object
// - 3.5 Attach meta object to content

const extractMetaDataBasedOnContentType = (content: contentLib.Content) => {
    const keys = keysToMigrate[content.type];
    const data: { [key: string]: any } = {};

    keys.forEach((key) => {
        if (content.data[key]) {
            data[key] = content.data[key];
        }
    });

    return data;
};

const singleMigrateContent = (content: contentLib.Content) => {
    const data = extractMetaDataBasedOnContentType(content);

    log.info(JSON.stringify(data));
};

export const migrateMetaData = () => {
    log.info('Migrating now!');

    runInContext({ branch: 'draft', asAdmin: true }, () => {
        contentTypesToMigrate.forEach((contentType) => {
            log.info(`Migrating content type ${contentType}`);
            const contentWithFormDetails = contentLib.query({
                count: 2000,
                contentTypes: [contentType],
            });

            contentWithFormDetails.hits.forEach((content) => {
                singleMigrateContent(content);
            });
        });
    });
};

// Cleanup
// -----------------

export const deleteOldMetadataFromContent = () => {
    log.info('Deleting old metadata from content');
};
