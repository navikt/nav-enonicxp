import contentLib, { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import commonLib from '/lib/xp/common';
import { OfficeBranch } from '../../site/content-types/office-branch/office-branch';
import { createObjectChecksum } from '../utils/nav-utils';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';

import { officeCopies } from './officeCopies';

type OfficeBranchDescriptor = NavNoDescriptor<'office-branch'>;

const officeBranchContentType: OfficeBranchDescriptor = `no.nav.navno:office-branch`;
const basePath = '/www.nav.no/kontor';

export const fetchAllOfficeBranchesFromNorg = () => {
    // Remove
    const string = JSON.stringify(officeCopies);
    return JSON.parse(string) as OfficeBranch[];

    // Return officeCopies for import demo.

    // Remove end
    /**
    log.info(
        `OfficeImporting: Fetching norg2 from url https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV`
    );
    const tempUrl =
        'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV';
    try {
        const response = httpClient.request({
            url: tempUrl, // app.config.norg2v2,
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
        logger.error(`OfficeImporting: Exception from norg2 request: ${e}`);
        return null;
    }

     */
};

// Check if a path is taken by some alien content (non-office-branch content).
// No content other than office branches should be in the 'kontor' folder, so that content
// should be considered alien.
const isPathOccupiedByAlienContent = (name: string) => {
    const updatedPath = `${basePath}/${name}`;
    const existingContentOnPath = contentLib.get({ key: updatedPath });

    return existingContentOnPath && existingContentOnPath.type !== officeBranchContentType;
};

// Delete content from XP
const deleteContent = (name: string) => {
    const fullPath = `${basePath}/${name}`;
    const content = contentLib.get({ key: fullPath });

    if (!content) {
        return null;
    }

    // Move the content to a temp path first, as deletion does not seem to be a synchronous operation
    // We want to free up the source path immediately
    contentLib.move({
        source: content._id,
        target: `${fullPath}-delete`,
    });

    contentLib.delete({
        key: content._id,
    });
};

const getOfficeBranchLanguage = (office: any) => {
    return office.data?.brukerkontakt?.skriftspraak?.toLowerCase() || 'no';
};

const getExistingOfficeBranchesInXP = () => {
    return contentLib
        .getChildren({
            key: basePath,
            count: 2000,
        })
        .hits.filter(
            (office) => office.type === officeBranchContentType
        ) as Content<OfficeBranchDescriptor>[];
};

const moveOfficeToNewName = (existingOffice: Content<OfficeBranchDescriptor>, newOffice: any) => {
    const currentName = existingOffice._name;
    const newName = commonLib.sanitize(newOffice.navn);

    try {
        logger.info(`OfficeImporting: Updating name/path: ${currentName} -> ${newName}`);

        // Move the office branch page to a new path if the name changed
        contentLib.move({
            source: existingOffice._path,
            target: newName,
        });

        // Create a redirect from the old path
        contentLib.create<'no.nav.navno:internal-link'>({
            name: currentName,
            parentPath: basePath,
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

const updateExistingOfficeBranch = (
    newOffice: any,
    existingOffice: Content<OfficeBranchDescriptor>
) => {
    const newName = commonLib.sanitize(newOffice.navn);
    const updatedChecksum = createObjectChecksum(newOffice);
    let wasUpdated = false;

    if (
        existingOffice.data.checksum !== updatedChecksum ||
        existingOffice.displayName !== newOffice.navn
    ) {
        try {
            contentLib.modify<OfficeBranchDescriptor>({
                key: existingOffice._id,
                editor: (content) => ({
                    ...content,
                    language: getOfficeBranchLanguage(content),
                    displayName: newOffice.navn,
                    data: { ...newOffice, checksum: updatedChecksum },
                }),
            });
            wasUpdated = true;
        } catch (e) {
            logger.critical(
                `OfficeImporting: Failed to modify office branch content ${existingOffice._path} - ${e}`
            );
        }
    }

    if (newName !== existingOffice._name) {
        logger.info(`Moving ${existingOffice._name} to ${newName}`);
        moveOfficeToNewName(existingOffice, newOffice);
        wasUpdated = true;
    }

    return wasUpdated;
};

const addNewOfficeBranch = (singleOffice: any) => {
    const pathName = commonLib.sanitize(singleOffice.navn);

    let wasAdded = false;

    try {
        contentLib.create({
            name: pathName,
            parentPath: basePath,
            displayName: singleOffice.navn,
            language: getOfficeBranchLanguage(singleOffice),
            contentType: officeBranchContentType,
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

const deleteStaleOfficesFromXP = (
    existingOfficesInXP: Content<OfficeBranchDescriptor>[],
    validOfficeIds: string[]
) => {
    let deleteCount = 0;
    existingOfficesInXP.forEach((existingOffice) => {
        const { enhetNr, navn } = existingOffice?.data;

        if (!validOfficeIds.includes(enhetNr)) {
            deleteContent(commonLib.sanitize(navn));
            deleteCount++;
        }
    });

    return deleteCount;
};

export const processAllOfficeBranches = (newOfficeBranches: OfficeBranch[]) => {
    const existingOfficesInXP = getExistingOfficeBranchesInXP();
    const processedOfficeBranchIds: string[] = [];

    const summary: { created: number; updated: number; deleted: number } = {
        created: 0,
        updated: 0,
        deleted: 0,
    };

    newOfficeBranches.forEach((newSingleOffice) => {
        const name = commonLib.sanitize(newSingleOffice.navn);

        if (isPathOccupiedByAlienContent(name)) {
            deleteContent(name);
        }

        const existingOfficeInXP = existingOfficesInXP.find(
            (content) => content.data?.enhetNr === newSingleOffice.enhetNr
        );

        if (existingOfficeInXP) {
            const wasUpdated = updateExistingOfficeBranch(newSingleOffice, existingOfficeInXP);
            summary.updated += wasUpdated ? 1 : 0;
        } else {
            const wasAdded = addNewOfficeBranch(newSingleOffice);
            summary.created += wasAdded ? 1 : 0;
        }

        processedOfficeBranchIds.push(newSingleOffice.enhetNr);
    });

    summary.deleted = deleteStaleOfficesFromXP(existingOfficesInXP, processedOfficeBranchIds);

    // Publish all updates made inside basePath
    // This includes updates and new office branches
    const publishResponse = contentLib.publish({
        keys: [basePath],
        sourceBranch: 'draft',
        targetBranch: 'master',
        includeDependencies: true,
    });

    logger.info(`PublishResponse: ${JSON.stringify(publishResponse)}`);

    logger.info(
        `OfficeImporting: Import summary from NORG2 - Updated: ${summary.updated} Created: ${summary.created} Deleted: ${summary.deleted}`
    );
};
