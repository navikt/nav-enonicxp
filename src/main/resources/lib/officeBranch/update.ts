import contentLib, { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import * as commonLib from '/lib/xp/common';
import { OfficeBranch } from '../../site/content-types/office-branch/office-branch';
import { createObjectChecksum } from '../utils/nav-utils';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';

type OfficeBranchDescriptor = NavNoDescriptor<'office-branch'>;

const officeBranchContentType: OfficeBranchDescriptor = `no.nav.navno:office-branch`;
const basePath = '/www.nav.no/kontor';

export const fetchAllOfficeBranchesFromNorg = () => {
    try {
        const response = httpClient.request({
            url: app.config.norg2,
            method: 'GET',
            headers: {
                'x-nav-apiKey': app.config.norg2ApiKey,
                consumerId: app.config.norg2ConsumerId,
            },
        });

        if (response.status === 200 && response.body) {
            return JSON.parse(response.body);
        } else {
            logger.error(`Bad response from norg2: ${response.status} - ${response.message}`);
            return null;
        }
    } catch (e) {
        logger.error(`Exception from norg2 request: ${e}`);
        return null;
    }
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
    const enhet = newOffice.enhet;
    const newName = commonLib.sanitize(enhet.navn);

    try {
        logger.info(`Updating name/path: ${currentName} -> ${newName}`);

        // Move the office branch page to a new path if the name changed
        contentLib.move({
            source: existingOffice._path,
            target: newName,
        });

        // Create a redirect from the old path
        contentLib.create<'no.nav.navno:internal-link'>({
            name: currentName,
            parentPath: basePath,
            displayName: `${existingOffice.displayName} (redirect til ${enhet.navn})`,
            contentType: `${app.name}:internal-link`,
            data: {
                target: existingOffice._id,
                permanentRedirect: false,
                redirectSubpaths: false,
            },
        });
    } catch (e) {
        logger.critical(`Failed to updated office branch name for ${existingOffice._path} - ${e}`);
    }
};

const updateExistingOfficeBranch = (
    newOffice: any,
    existingOffice: Content<OfficeBranchDescriptor>
) => {
    const { enhet } = newOffice;
    const newName = commonLib.sanitize(enhet.navn);
    const updatedChecksum = createObjectChecksum(newOffice);
    let wasUpdated = false;

    if (
        existingOffice.data.checksum !== updatedChecksum ||
        existingOffice.displayName !== enhet.navn
    ) {
        try {
            contentLib.modify<OfficeBranchDescriptor>({
                key: existingOffice._id,
                editor: (content) => ({
                    ...content,
                    language: getOfficeBranchLanguage(content),
                    displayName: enhet.navn,
                    data: { ...newOffice, checksum: updatedChecksum },
                }),
            });
            wasUpdated = true;
        } catch (e) {
            logger.critical(
                `Failed to modify office branch content ${existingOffice._path} - ${e}`
            );
        }
    }

    if (newName !== existingOffice._name) {
        moveOfficeToNewName(existingOffice, newOffice);
        wasUpdated = true;
    }

    return wasUpdated;
};

const addNewOfficeBranch = (singleOffice: any) => {
    const { enhet } = singleOffice;
    const pathName = commonLib.sanitize(enhet.navn);

    let wasAdded = false;

    try {
        contentLib.create({
            name: pathName,
            parentPath: basePath,
            displayName: enhet.navn,
            language: getOfficeBranchLanguage(enhet),
            contentType: officeBranchContentType,
            data: {
                ...singleOffice,
                checksum: createObjectChecksum(singleOffice),
            },
        });
        wasAdded = true;
    } catch (e) {
        logger.critical(`Failed to create new office page for ${enhet.navn} - ${e}`);
    }

    return wasAdded;
};

const isIgnorableOfficeBranch = (officeBranch: OfficeBranch) => {
    return officeBranch?.enhet?.status === 'Nedlagt' || officeBranch?.enhet?.type !== 'LOKAL';
};

const deleteStaleOfficesFromXP = (
    existingOfficesInXP: Content<OfficeBranchDescriptor>[],
    validOfficeIds: number[]
) => {
    let deleteCount = 0;
    existingOfficesInXP.forEach((existingOffice) => {
        const { enhet } = existingOffice?.data;

        if (enhet && !validOfficeIds.includes(enhet.enhetId)) {
            deleteContent(commonLib.sanitize(enhet.navn));
            deleteCount++;
        }
    });

    return deleteCount;
};

export const processAllOfficeBranches = (newOfficeBranches: OfficeBranch[]) => {
    const existingOfficesInXP = getExistingOfficeBranchesInXP();
    const processedOfficeBranchIds: number[] = [];

    const summary: { created: number; updated: number; deleted: number } = {
        created: 0,
        updated: 0,
        deleted: 0,
    };

    newOfficeBranches.forEach((singleOffice) => {
        const { enhet } = singleOffice;
        const name = commonLib.sanitize(enhet.navn);

        if (isIgnorableOfficeBranch(singleOffice)) {
            return;
        }

        if (isPathOccupiedByAlienContent(name)) {
            deleteContent(name);
        }

        const existingOfficeInXP = existingOfficesInXP.find(
            (content) => content.data?.enhet?.enhetId === enhet.enhetId
        );

        if (existingOfficeInXP) {
            const wasUpdated = updateExistingOfficeBranch(singleOffice, existingOfficeInXP);
            summary.updated += wasUpdated ? 1 : 0;
        } else {
            const wasAdded = addNewOfficeBranch(singleOffice);
            summary.created += wasAdded ? 1 : 0;
        }

        processedOfficeBranchIds.push(enhet.enhetId);
    });

    summary.deleted = deleteStaleOfficesFromXP(existingOfficesInXP, processedOfficeBranchIds);

    // Publish all updates made inside basePath
    // This includes updates and new office branches
    contentLib.publish({
        keys: [basePath],
        sourceBranch: 'draft',
        targetBranch: 'master',
        includeDependencies: true,
    });

    logger.info(
        `Import summary from NORG2 - Updated: ${summary.updated} Created: ${summary.created} Deleted: ${summary.deleted}`
    );
};
