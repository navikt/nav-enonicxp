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

const createContentName = (officeData: OfficeBranchData) => commonLib.sanitize(officeData.navn)

export const fetchAllOfficeBranchDataFromNorg = () => {
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

const deleteContent = (contentRef: string) => {
    const office = contentLib.get({ key: contentRef });
    if (!office) {
        return null;
    }

    contentLib.unpublish({ keys: [office._id] });

    // Move the content to a temp path first, as deletion does not seem to be a synchronous operation
    // We want to free up the source path immediately
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

const moveAndRedirectOnNameChange = (
    prevOfficePage: Content<OfficeBranchDescriptor>,
    newOfficeData: OfficeBranchData
) => {
    const prevContentName = prevOfficePage._name;
    const newContentName = createContentName(newOfficeData);

    if (prevContentName === newContentName) {
        return;
    }

    try {
        logger.info(`OfficeImporting: moving to new name: ${prevContentName} -> ${newContentName}`);

        contentLib.move({
            source: prevOfficePage._path,
            target: newContentName,
        });

        // Create a redirect from the old path
        contentLib.create<InternalLinkDescriptor>({
            name: prevContentName,
            parentPath: OFFICES_BASE_PATH,
            displayName: `${prevOfficePage.displayName} (redirect til ${newOfficeData.navn})`,
            contentType: INTERNAL_LINK_CONTENT_TYPE,
            data: {
                target: prevOfficePage._id,
                permanentRedirect: false,
                redirectSubpaths: false,
            },
        });
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to update office branch name for ${prevOfficePage._path} - ${e}`
        );
    }
};

const updateOfficePageIfChanged = (
    newOfficeData: OfficeBranchData,
    existingOfficePage: Content<OfficeBranchDescriptor>
) => {
    const newChecksum = createObjectChecksum(newOfficeData);
    if (newChecksum === existingOfficePage.data.checksum) {
        return false;
    }

    try {
        moveAndRedirectOnNameChange(existingOfficePage, newOfficeData);

        contentLib.modify<OfficeBranchDescriptor>({
            key: existingOfficePage._id,
            editor: (content) => ({
                ...content,
                language: getOfficeBranchLanguage(newOfficeData),
                displayName: newOfficeData.navn,
                data: { ...newOfficeData, checksum: newChecksum },
            }),
        });

        return true;
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to modify office branch content ${existingOfficePage._path} - ${e}`
        );
        return false;
    }
};

const createOfficeBranchPage = (officeData: OfficeBranchData) => {
    try {
        logger.info('Trying to create office branch page');
        contentLib.create({
            name: createContentName(officeData),
            parentPath: OFFICES_BASE_PATH,
            displayName: officeData.navn,
            language: getOfficeBranchLanguage(officeData),
            contentType: OFFICE_BRANCH_CONTENT_TYPE,
            data: {
                ...officeData,
                checksum: createObjectChecksum(officeData),
            },
        });

        return true;
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to create new office page for ${officeData.navn} - ${e}`
        );

        return false;
    }
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
        const name = createContentName(officeBranch);

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
            const wasAdded = createOfficeBranchPage(officeBranch);
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
