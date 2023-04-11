import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import * as commonLib from '/lib/xp/common';
import { OfficeBranch } from '../../site/content-types/office-branch/office-branch';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';
import { CONTENT_LOCALE_DEFAULT, URLS } from '../constants';
import { createObjectChecksum } from '../utils/object-utils';

type OfficeBranchDescriptor = NavNoDescriptor<'office-branch'>;
type InternalLinkDescriptor = NavNoDescriptor<'internal-link'>;

const officeBranchContentType: OfficeBranchDescriptor = `no.nav.navno:office-branch`;
const internalLinkType: InternalLinkDescriptor = `no.nav.navno:internal-link`;
const basePath = '/www.nav.no/kontor';

export const fetchAllOfficeBranchesFromNorg = () => {
    try {
        const response = httpClient.request({
            url: `${URLS.NORG_OFFICE_ORIGIN}`,
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
            `OfficeImporting: Exception from norg2 request: ${e}. Fetching from ${URLS.NORG_OFFICE_ORIGIN}.`
        );
        return null;
    }
};

// Check if a path is taken by some alien content (non-office-branch content).
// No content other than office branches should be in the 'kontor' folder, so that content
// should be considered alien.
const isPathOccupiedByAlienContent = (name: string) => {
    const updatedPath = `${basePath}/${name}`;
    const existingContentOnPath = contentLib.get({ key: updatedPath });

    return (
        existingContentOnPath &&
        existingContentOnPath.type !== officeBranchContentType &&
        existingContentOnPath.type !== internalLinkType
    );
};

// Delete content from XP
const deleteContent = (name: string) => {
    const office = contentLib.get({ key: `${basePath}/${name}` });

    if (!office) {
        return null;
    }

    const officeId = office._id;

    // Move the content to a temp path first, as deletion does not seem to be a synchronous operation
    // We want to free up the source path immediately
    contentLib.unpublish({ keys: [officeId] });

    contentLib.move({
        source: office._path,
        target: `${office._name}-delete`,
    });

    contentLib.delete({
        key: officeId,
    });

    return officeId;
};

const getOfficeBranchLanguage = (office: any) => {
    return office.data?.brukerkontakt?.skriftspraak?.toLowerCase() || CONTENT_LOCALE_DEFAULT;
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
        logger.info(`OfficeImporting: moving to new name: ${currentName} -> ${newName}`);

        // Move the office branch page to a new path if the name changed
        contentLib.move({
            source: existingOffice._path,
            target: newName,
        });

        // Create a redirect from the old path

        const internalLink = contentLib.create<'no.nav.navno:internal-link'>({
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

        contentLib.publish({
            keys: [internalLink._id],
            sourceBranch: 'draft',
            targetBranch: 'master',
            includeDependencies: false,
        });
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to update office branch name for ${existingOffice._path} - ${e}`
        );
    }
};

const updateOfficeBranchIfChange = (
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

    try {
        logger.info('trying to create office branch');
        const content = contentLib.create({
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
        return content._id;
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to create new office page for ${singleOffice.navn} - ${e}`
        );
        return null;
    }
};

const deleteStaleOfficesFromXP = (
    existingOfficesInXP: Content<OfficeBranchDescriptor>[],
    validOfficeEnhetNrs: string[]
) => {
    const deletedIds: string[] = [];
    existingOfficesInXP.forEach((existingOffice) => {
        const { enhetNr, navn } = existingOffice?.data;
        let deletedId;

        if (!validOfficeEnhetNrs.includes(enhetNr)) {
            deletedId = deleteContent(commonLib.sanitize(navn));
        }

        if (deletedId) {
            deletedIds.push(deletedId);
        }
    });

    return deletedIds;
};

export const processAllOfficeBranches = (incomingOfficeBranches: OfficeBranch[]) => {
    const existingOfficesInXP = getExistingOfficeBranchesInXP();
    const processedOfficeBranchEnhetNr: string[] = [];

    const summary: { created: string[]; updated: string[]; deleted: string[] } = {
        created: [],
        updated: [],
        deleted: [],
    };

    incomingOfficeBranches.forEach((singleOfficeBranch) => {
        const name = commonLib.sanitize(singleOfficeBranch.navn);

        if (isPathOccupiedByAlienContent(name)) {
            logger.info(
                'Found alien (non-office or internal link for redirect) content on path, deleting it.'
            );
            deleteContent(name);
        }

        const existingOfficeInXP = existingOfficesInXP.find(
            (content) =>
                !!content.data?.enhetNr && content.data?.enhetNr === singleOfficeBranch.enhetNr
        );

        if (existingOfficeInXP) {
            const wasUpdated = updateOfficeBranchIfChange(singleOfficeBranch, existingOfficeInXP);
            summary.updated = wasUpdated
                ? [...summary.updated, existingOfficeInXP._id]
                : summary.updated;
        } else {
            const createdId = addNewOfficeBranch(singleOfficeBranch);
            summary.created = createdId ? [...summary.created, createdId] : summary.created;
        }

        processedOfficeBranchEnhetNr.push(singleOfficeBranch.enhetNr);
    });

    summary.deleted = deleteStaleOfficesFromXP(existingOfficesInXP, processedOfficeBranchEnhetNr);
    const idsToPublish = [...summary.created, ...summary.updated];

    // Publish all updated and created offices by id.
    const publishResponse = contentLib.publish({
        keys: idsToPublish,
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
        `OfficeImporting: Import summary from NORG2 - Updated: ${summary.updated.length} Created: ${summary.created.length} Deleted: ${summary.deleted.length}`
    );
};
