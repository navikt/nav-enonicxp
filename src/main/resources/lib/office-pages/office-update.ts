import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { request } from '/lib/http-client';
import * as commonLib from '/lib/xp/common';
import { OfficeBranch as OfficeBranchData } from '@xp-types/site/content-types/office-branch';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';
import { CONTENT_LOCALE_DEFAULT, URLS } from '../constants';
import { createObjectChecksum } from '../utils/object-utils';

type OfficeBranchDescriptor = NavNoDescriptor<'office-branch'>;
type OfficePageDescriptor = NavNoDescriptor<'office-page'>;
type InternalLinkDescriptor = NavNoDescriptor<'internal-link'>;

type RequestConfig = {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
};

type OfficeOverview = {
    enhetId: string;
    enhetNr: string;
    navn: string;
    type: string;
};

type OfficeTypeDictionary = Map<string, string>;

const OFFICE_BRANCH_CONTENT_TYPE: OfficeBranchDescriptor = `no.nav.navno:office-branch`;
const OFFICE_PAGE_CONTENT_TYPE: OfficePageDescriptor = `no.nav.navno:office-page`;
const INTERNAL_LINK_CONTENT_TYPE: InternalLinkDescriptor = `no.nav.navno:internal-link`;
const OFFICES_BASE_PATH = '/www.nav.no/kontor';

const getOfficeContentName = (officeData: OfficeBranchData) => commonLib.sanitize(officeData.navn);

const generalOfficeTypes: ReadonlySet<string> = new Set([
    'FPY',
    'KLAGE',
    'KONTROLL',
    'OKONOMI',
    'HMS',
    'YTA',
    'OPPFUTLAND',
]);

const norgRequest = <T>(requestConfig: RequestConfig): T[] | null => {
    const response = request({
        url: requestConfig.url,
        method: requestConfig.method,
        contentType: 'application/json',
        headers: {
            'x-nav-apiKey': app.config.norg2ApiKey,
            consumerId: app.config.norg2ConsumerId,
        },
        body: requestConfig.body,
    });

    if (response.status === 200 && response.body) {
        return JSON.parse(response.body);
    } else {
        logger.error(
            `OfficeImporting: Bad response from norg2: ${response.status} - ${response.message}, ${requestConfig.url}`
        );
        return null;
    }
};

const localOfficeAdapter = (localOfficeData: OfficeBranchData): OfficeBranchData => {
    return { ...localOfficeData, type: 'LOKAL' };
};

const generalOfficeAdapter = (
    officeData: GeneralOfficeData,
    officeTypeDictionary: OfficeTypeDictionary
): OfficeBranchData => {
    const type = officeTypeDictionary.get(officeData.enhetNr) || '';
    return {
        enhetNr: officeData.enhetNr,
        navn: officeData.navn,
        type,
        status: 'Aktiv',
        organisasjonsnummer: '',
        sosialeTjenester: '',
        spesielleOpplysninger: officeData.spesielleOpplysninger,
        underEtableringDato: '',
        aktiveringsdato: '',
        nedleggelsesdato: '',
        beliggenhet: officeData.besoeksadresse,
        postadresse: officeData.postadresse,
        brukerkontakt: officeData.brukerkontakt,
    };
};

export const fetchAllOfficeDataFromNorg = () => {
    try {
        const officeTypeDictionary = new Map<string, string>();

        const officeOverview = norgRequest<OfficeOverview>({
            url: `${URLS.NORG_OFFICE_OVERVIEW_API_URL}`,
            method: 'GET',
        });

        if (!officeOverview) {
            logger.error(
                `OfficeImporting: Bad response from norg2 from /enhet-endpoint (officeOverview)`
            );
            return null;
        }

        // The other endpoints will not include office type, so we need to
        // make a dictionary to look up the type from the office number.
        officeOverview.forEach((office) => officeTypeDictionary.set(office.enhetNr, office.type));

        // Not all offices in the overview should be fetched,
        // so make a list of enhetNr to actually fetch.
        const relevantGeneralOffices = officeOverview
            ?.filter((office) => generalOfficeTypes.has(office.type))
            .map((office) => office.enhetNr);

        const localOffices = norgRequest<OfficeBranchData>({
            url: URLS.NORG_LOCAL_OFFICE_API_URL,
            method: 'GET',
        });

        const generalOffices = norgRequest<GeneralOfficeData>({
            url: URLS.NORG_OFFICE_INFORMATION_API_URL,
            method: 'POST',
            body: JSON.stringify(relevantGeneralOffices),
        });

        if (!localOffices || !generalOffices) {
            logger.error(`OfficeImporting: Could not fetch local offices or enhet from norg2`);
            return;
        }

        const adaptedGeneralOffices = generalOffices.map((generalOffice) =>
            generalOfficeAdapter(generalOffice, officeTypeDictionary)
        );

        const adaptedLocalOffices = localOffices.map((localOffice) =>
            localOfficeAdapter(localOffice)
        );

        log.info(
            `OfficeImporting: Local office: ${localOffices.length}, general office: ${adaptedGeneralOffices.length}.`
        );

        return adaptedGeneralOffices; //[...adaptedGeneralOffices, ...adaptedLocalOffices];
    } catch (e) {
        logger.error(
            `OfficeImporting: Exception from norg2 request: ${e}. Fetching from ${URLS.NORG_LOCAL_OFFICE_API_URL}.`
        );
        return null;
    }
};

// Check if a path is taken by content with an invalid type
// (only office-branch pages and internal redirects should be allowed)
const pathHasInvalidContent = (pathName: string) => {
    const existingContent = contentLib.get({ key: pathName });

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

    const officeId = office._id;

    contentLib.unpublish({ keys: [officeId] });

    // Move the content to a temp path first, as deletion does not seem to be a synchronous operation
    // We want to free up the source path immediately
    contentLib.move({
        source: office._path,
        target: `${office._name}-delete`,
    });

    contentLib.delete({
        key: officeId,
    });

    return officeId;
};

const getOfficeBranchLanguage = (office: OfficeBranchData) => {
    if (office.brukerkontakt?.skriftspraak?.toLowerCase() === 'nb') {
        return CONTENT_LOCALE_DEFAULT;
    }
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
    const newContentName = getOfficeContentName(newOfficeData);

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
        const internalLink = contentLib.create<InternalLinkDescriptor>({
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

        contentLib.publish({
            keys: [internalLink._id],
            sourceBranch: 'draft',
            targetBranch: 'master',
            includeDependencies: false,
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
    if (
        newChecksum === existingOfficePage.data.checksum &&
        newOfficeData.navn === existingOfficePage.displayName
    ) {
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

const createOfficePage = (officeData: OfficeBranchData) => {
    try {
        logger.info('Trying to create office branch page');
        const contentType =
            officeData.type === 'LOKAL' ? OFFICE_BRANCH_CONTENT_TYPE : OFFICE_PAGE_CONTENT_TYPE;

        const content = contentLib.create({
            name: getOfficeContentName(officeData),
            parentPath: OFFICES_BASE_PATH,
            displayName: officeData.navn,
            language: getOfficeBranchLanguage(officeData),
            contentType,
            data: {
                ...officeData,
                checksum: createObjectChecksum(officeData),
            },
        });

        return content._id;
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to create new office page for ${officeData.navn} - ${e}`
        );
        return null;
    }
};

const deleteStaleOfficePages = (
    existingOfficePages: Content<OfficeBranchDescriptor>[],
    validOfficeEnhetsNr: string[]
) => {
    const deletedIds: string[] = [];

    existingOfficePages.forEach((existingOffice) => {
        const { enhetNr } = existingOffice.data;

        if (!validOfficeEnhetsNr.includes(enhetNr)) {
            const deletedId = deleteContent(existingOffice._id);
            if (deletedId) {
                deletedIds.push(deletedId);
            }
        }
    });

    return deletedIds;
};

export const processAllOffices = (offices: OfficeBranchData[]) => {
    const existingOfficePages = getExistingOfficePages();
    const processedOfficeEnhetsNr: string[] = [];

    const summary: { created: string[]; updated: string[]; deleted: string[] } = {
        created: [],
        updated: [],
        deleted: [],
    };

    offices.forEach((officeBranchData) => {
        const contentName = getOfficeContentName(officeBranchData);
        const pathName = `${OFFICES_BASE_PATH}/${contentName}`;

        if (pathHasInvalidContent(pathName)) {
            logger.info(`Found invalid content on ${pathName} - deleting`);
            deleteContent(pathName);
        }

        const existingPage = existingOfficePages.find(
            (content) =>
                !!content.data?.enhetNr && content.data.enhetNr === officeBranchData.enhetNr
        );

        if (existingPage) {
            const wasUpdated = updateOfficePageIfChanged(officeBranchData, existingPage);
            if (wasUpdated) {
                summary.updated.push(existingPage._id);
            }
        } else {
            const createdId = createOfficePage(officeBranchData);
            if (createdId) {
                summary.created.push(createdId);
            }
        }

        processedOfficeEnhetsNr.push(officeBranchData.enhetNr);
    });

    summary.deleted = []; // deleteStaleOfficePages(existingOfficePages, processedOfficeEnhetsNr);

    if (summary.deleted.length > 0) {
        logger.info(`Office pages deleted: ${summary.deleted.length}`);
    }

    const contentToPublish = [...summary.created, ...summary.updated];

    if (contentToPublish.length === 0) {
        logger.info('No offices were updated');
        return;
    }

    const publishResponse = contentLib.publish({
        keys: contentToPublish,
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
        `Import summary from NORG2 - Updated: ${summary.updated.length} Created: ${summary.created.length}`
    );
};
