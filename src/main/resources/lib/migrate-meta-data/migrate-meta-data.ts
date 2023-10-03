import * as contentLib from '/lib/xp/content';
import { runInContext } from '../../lib/context/run-in-context';

import { keysToMigrate, contentTypesToMigrate, allValidTaxonomies } from './migration-config';

const dataPageParentPath = '/www.nav.no/page-meta';

// Migration of meta data
// -----------------
// 1. Doing one content type at a time.
// 2. Find all content in default draft repo (no) for each content type.
// 3. For each found content
// - 3.1 Check if content already has a reference to a meta object
// - 3.2 If not, create a meta object, else stop.
// - 3.3 Extract meta data from content
// - 3.4 Add meta data to meta object
// - 3.5 Attach meta object to content
// - 3.5 Copy displayName to title in content.

// Cleanup
// ------------------

const normalizeInvalidData = (content: contentLib.Content) => {
    const { type, data } = content;
    const validFields = keysToMigrate[type];
    const validTaxonomies = allValidTaxonomies[type];
    const mutatedData = { ...data };

    // Some content has had it's schema changed with fields removed, while
    // the actual data still exist. This data would no longer be
    // valid, so we need to remove these orphan fields.
    Object.keys(mutatedData).forEach((key) => {
        if (!validFields.includes(key)) {
            delete mutatedData[key];
        }
    });

    // audience was changed from string to option set, so we need to
    // normalize for older content that wasn't migrated.
    if (typeof data.audience === 'string') {
        mutatedData.audience = {
            _selected: data.audience,
        };
    }

    // If undefined, the content is not using taxonomies.
    if (validTaxonomies) {
        mutatedData.taxonomy = validTaxonomies.includes(mutatedData.taxonomy)
            ? mutatedData.taxonomy
            : validTaxonomies[0];
    }

    return mutatedData;
};

const createPageMetaObject = (data: any, originalContent: contentLib.Content) => {
    log.info(`Create meta data page for ${originalContent._id}, ${originalContent.type}}`);

    const fullPath = `${dataPageParentPath}/${originalContent._id}`;

    if (contentLib.exists({ key: fullPath })) {
        log.info(`Updating data for: ${fullPath}`);
        try {
            contentLib.modify({
                key: fullPath,
                editor: (c) => {
                    c.data = data;
                    c.displayName = originalContent.displayName;
                    return c;
                },
                requireValid: false,
            });
        } catch (e: any) {
            log.info(`Failed to update data for: ${fullPath} failed with ${e}`);
        }
    } else {
        try {
            log.info(`Creating data for: ${fullPath}`);
            contentLib.create({
                name: originalContent._id,
                parentPath: dataPageParentPath,
                displayName: originalContent.displayName,
                contentType: 'no.nav.navno:page-meta',
                requireValid: false,
                data,
            });
        } catch (e: any) {
            log.info(`Failed to create meta data page for ${e}`);
        }
    }
};

const buildMetaPageData = (sourceData: any, content: contentLib.Content) => {
    const selectedContentType = content.type.split(':')[1];
    const data = {
        contentType: {
            _selected: selectedContentType,
            [selectedContentType]: sourceData,
        },
        targetId: content._id,
    };

    return data;
};

const processSingleContent = (content: contentLib.Content) => {
    log.info('-----------------------------------------------------------------');
    log.info(`Processing content ${content._id}`);
    log.info('-----------------------------------------------------------------');
    const sourceData = normalizeInvalidData(content);
    const metaPageData = buildMetaPageData(sourceData, content);

    createPageMetaObject(metaPageData, content);
};

export const startPageMetaDataCreation = () => {
    log.info('Starting meta-object-page generation process');

    runInContext({ branch: 'draft', asAdmin: true }, () => {
        contentTypesToMigrate.forEach((contentType) => {
            const content = contentLib.query({
                count: 2000,
                contentTypes: [contentType],
            });
            log.info(`Found ${content.total} content of type ${contentType}`);

            content.hits.forEach((content) => {
                processSingleContent(content);
            });
        });
    });
};
