import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import * as commonLib from '/lib/xp/common';
import { OfficeBranch as OfficeBranchData } from '../../site/content-types/office-branch/office-branch';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';
import { CONTENT_LOCALE_DEFAULT, URLS } from '../constants';
import { createObjectChecksum } from '../utils/object-utils';

type OfficeBranchDescriptor = NavNoDescriptor<'office-branch'>;
type InternalLinkDescriptor = NavNoDescriptor<'internal-link'>;

const OFFICE_BRANCH_CONTENT_TYPE: OfficeBranchDescriptor = `no.nav.navno:office-branch`;
const INTERNAL_LINK_CONTENT_TYPE: InternalLinkDescriptor = `no.nav.navno:internal-link`;
const OFFICES_BASE_PATH = '/www.nav.no/kontor';

export const fetchAllOfficeBranchesFromNorg = () => {
    try {
        const response = httpClient.request({
            url: URLS.NORG_OFFICE_API_URL,
            method: 'GET',
            headers: {
                'x-nav-apiKey': app.config.norg2ApiKey,
                consumerId: app.config.norg2ConsumerId,
            },
        });

        if (response.status === 200 && response.body) {
            return JSON.parse(response.body);
        } else {
            logger.error(
                `OfficeImporting: Bad response from norg2: ${response.status} - ${response.message}`
            );
            return null;
        }
    } catch (e) {
        logger.error(
            `OfficeImporting: Exception from norg2 request: ${e}. Fetching from ${URLS.NORG_OFFICE_API_URL}.`
        );
        return null;
    }
};

// Check if a path is taken by content with an invalid type
// (only office-branch pages and internal redirects should be allowed)
const pageHasInvalidContentType = (name: string) => {
    const pathname = `${OFFICES_BASE_PATH}/${name}`;
    const existingContent = contentLib.get({ key: pathname });

    return (
        existingContent &&
        existingContent.type !== OFFICE_BRANCH_CONTENT_TYPE &&
        existingContent.type !== INTERNAL_LINK_CONTENT_TYPE
    );
};

// Delete content from XP
const deleteContent = (contentRef: string) => {
    const office = contentLib.get({ key: contentRef });
    if (!office) {
        return null;
    }

    // Move the content to a temp path first, as deletion does not seem to be a synchronous operation
    // We want to free up the source path immediately
    contentLib.unpublish({ keys: [office._id] });

    contentLib.move({
        source: office._path,
        target: `${office._name}-delete`,
    });
    contentLib.delete({
        key: office._id,
    });
};

const getOfficeBranchLanguage = (office: OfficeBranchData) => {
    return office.brukerkontakt?.skriftspraak?.toLowerCase() || CONTENT_LOCALE_DEFAULT;
};

const getExistingOfficePages = () => {
    return contentLib
        .getChildren({
            key: OFFICES_BASE_PATH,
            count: 2000,
        })
        .hits.filter(
            (office) => office.type === OFFICE_BRANCH_CONTENT_TYPE
        ) as Content<OfficeBranchDescriptor>[];
};

const moveOfficeToNewName = (
    existingOffice: Content<OfficeBranchDescriptor>,
    newOffice: OfficeBranchData
) => {
    const currentName = existingOffice._name;
    const newName = commonLib.sanitize(newOffice.navn);

    try {
        logger.info(`OfficeImporting: moving to new name: ${currentName} -> ${newName}`);

        // Move the office branch page to a new path if the name changed
        contentLib.move({
            source: existingOffice._path,
            target: newName,
        });

        // Create a redirect from the old path
        contentLib.create<'no.nav.navno:internal-link'>({
            name: currentName,
            parentPath: OFFICES_BASE_PATH,
            displayName: `${existingOffice.displayName} (redirect til ${newOffice.navn})`,
            contentType: `${app.name}:internal-link`,
            data: {
                target: existingOffice._id,
                permanentRedirect: false,
                redirectSubpaths: false,
            },
        });
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to update office branch name for ${existingOffice._path} - ${e}`
        );
    }
};

const updateOfficePageIfChanged = (
    newOfficeData: OfficeBranchData,
    existingOfficePage: Content<OfficeBranchDescriptor>
) => {
    const newName = commonLib.sanitize(newOfficeData.navn);
    const updatedChecksum = createObjectChecksum(newOfficeData);
    let wasUpdated = false;

    if (
        existingOfficePage.data.checksum !== updatedChecksum ||
        existingOfficePage.displayName !== newOfficeData.navn
    ) {
        try {
            contentLib.modify<OfficeBranchDescriptor>({
                key: existingOfficePage._id,
                editor: (content) => ({
                    ...content,
                    language: getOfficeBranchLanguage(newOfficeData),
                    displayName: newOfficeData.navn,
                    data: { ...newOfficeData, checksum: updatedChecksum },
                }),
            });
            wasUpdated = true;
        } catch (e) {
            logger.critical(
                `OfficeImporting: Failed to modify office branch content ${existingOfficePage._path} - ${e}`
            );
        }
    }

    if (newName !== existingOfficePage._name) {
        logger.info(`Moving ${existingOfficePage._name} to ${newName}`);
        moveOfficeToNewName(existingOfficePage, newOfficeData);
        wasUpdated = true;
    }

    return wasUpdated;
};

const addNewOfficeBranch = (singleOffice: OfficeBranchData) => {
    const name = commonLib.sanitize(singleOffice.navn);

    let wasAdded = false;

    try {
        logger.info('trying to create office branch');
        contentLib.create({
            name,
            parentPath: OFFICES_BASE_PATH,
            displayName: singleOffice.navn,
            language: getOfficeBranchLanguage(singleOffice),
            contentType: OFFICE_BRANCH_CONTENT_TYPE,
            data: {
                ...singleOffice,
                checksum: createObjectChecksum(singleOffice),
            },
        });
        wasAdded = true;
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to create new office page for ${singleOffice.navn} - ${e}`
        );
    }

    return wasAdded;
};

const deleteStaleOfficePages = (
    existingOfficePages: Content<OfficeBranchDescriptor>[],
    validOfficeEnhetsNr: string[]
) => {
    let deleteCount = 0;

    existingOfficePages.forEach((existingOffice) => {
        const { enhetNr } = existingOffice.data;

        if (!validOfficeEnhetsNr.includes(enhetNr)) {
            deleteContent(existingOffice._id);
            deleteCount++;
        }
    });

    return deleteCount;
};

export const processAllOfficeBranches = (incomingOfficeBranches: OfficeBranchData[]) => {
    const existingOfficePages = getExistingOfficePages();
    const processedOfficeEnhetsNr: string[] = [];

    const summary: { created: number; updated: number; deleted: number } = {
        created: 0,
        updated: 0,
        deleted: 0,
    };

    incomingOfficeBranches.forEach((officeBranch) => {
        const name = commonLib.sanitize(officeBranch.navn);

        if (pageHasInvalidContentType(name)) {
            logger.info(`Found invalid content with name ${name}`);
            deleteContent(name);
        }

        const existingPage = existingOfficePages.find(
            (content) => !!content.data?.enhetNr && content.data.enhetNr === officeBranch.enhetNr
        );

        if (existingPage) {
            const wasUpdated = updateOfficePageIfChanged(officeBranch, existingPage);
            summary.updated += wasUpdated ? 1 : 0;
        } else {
            const wasAdded = addNewOfficeBranch(officeBranch);
            summary.created += wasAdded ? 1 : 0;
        }

        processedOfficeEnhetsNr.push(officeBranch.enhetNr);
    });

    summary.deleted = deleteStaleOfficePages(existingOfficePages, processedOfficeEnhetsNr);

    // Publish all updates made inside basePath
    // This includes updates and new office branches
    const publishResponse = contentLib.publish({
        keys: [OFFICES_BASE_PATH],
        sourceBranch: 'draft',
        targetBranch: 'master',
        includeDependencies: false,
    });

    if (publishResponse.failedContents.length > 0) {
        logger.critical(
            `OfficeImporting: Failed to publish ${
                publishResponse.failedContents.length
            } offices with id : ${JSON.stringify(publishResponse.failedContents.join(','))}`
        );
    }

    logger.info(
        `OfficeImporting: Import summary from NORG2 - Updated: ${summary.updated} Created: ${summary.created} Deleted: ${summary.deleted}`
    );
};
