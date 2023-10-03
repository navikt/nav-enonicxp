import * as contentLib from '/lib/xp/content';
import { runInContext } from '../../lib/context/run-in-context';

import { keysToMigrate, contentTypesToMigrate, allValidTaxonomies } from './migration-config';

const dataPageParentPath = '/www.nav.no/page-meta';

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

    // audience was changed from string to option set. This is fixed in
    // prod, but with some legacy data in dev/q6/local.
    if (typeof data.audience === 'string') {
        mutatedData.audience = {
            _selected: data.audience,
        };
    }

    // If undefined, the content is not using taxonomies.
    if (validTaxonomies) {
        mutatedData.taxonomy = validTaxonomies.includes(mutatedData.taxonomy)
            ? mutatedData.taxonomy
            : null;
    }

    return mutatedData;
};

const createPageMeta = (data: any, originalContent: contentLib.Content) => {
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

const buildPageMetaData = (sourceData: any, content: contentLib.Content) => {
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
    log.info(`Processing content ${content.type}: ${content._id}`);
    log.info('-----------------------------------------------------------------');

    const normalizedData = normalizeInvalidData(content);
    const pageMetaData = buildPageMetaData(normalizedData, content);

    createPageMeta(pageMetaData, content);
};

export const startPageMetaCreation = () => {
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
