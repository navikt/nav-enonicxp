import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { HttpRequestParams, request } from '/lib/http-client';
import * as commonLib from '/lib/xp/common';
import { OfficePage as OfficePageData } from '@xp-types/site/content-types/office-page';
import { parseJsonToArray } from '../../lib/utils/array-utils';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';
import { CONTENT_LOCALE_DEFAULT, URLS } from '../constants';
import { createObjectChecksum } from '../utils/object-utils';
import { OfficeRawNORGData } from './office-raw-norg-data';

type OfficePageDescriptor = NavNoDescriptor<'office-page'>;
type InternalLinkDescriptor = NavNoDescriptor<'internal-link'>;

type OfficeNorgData = OfficePageData['officeNorgData']['data'];

type OfficeOverview = {
    enhetId: string;
    enhetNr: string;
    navn: string;
    type: string;
};

type OfficeTypeDictionary = Map<string, string>;

const OFFICE_PAGE_CONTENT_TYPE: OfficePageDescriptor = `no.nav.navno:office-page`;
const INTERNAL_LINK_CONTENT_TYPE: InternalLinkDescriptor = `no.nav.navno:internal-link`;
const OFFICES_BASE_PATH = '/www.nav.no/kontor';

const getOfficeContentName = (officeData: OfficeNorgData) => commonLib.sanitize(officeData.navn);

// Possible office types are FPY, KLAGE, KONTROLL, OKONOMI, HMS, YTA, OPPFUTLAND.
const officeTypesForImport: ReadonlySet<string> = new Set(['HMS']);

const norgRequest = <T>(requestConfig: HttpRequestParams): T[] | null => {
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
        return parseJsonToArray(response.body);
    } else {
        logger.error(
            `OfficeImporting: Bad response from norg2: ${response.status} - ${response.message}, ${requestConfig.url}`
        );
        return null;
    }
};

const localOfficeAdapter = (officeData: OfficeRawNORGData) => ({ ...officeData, type: 'LOKAL' });

const generalOfficeAdapter = (
    officeData: OfficeRawNORGData,
    officeTypeDictionary: OfficeTypeDictionary
): OfficeNorgData => {
    const type = officeTypeDictionary.get(officeData.enhetNr) || '';

    if (!type) {
        logger.warning(
            `OfficeImporting: Could not find the type for office with enhetNr: ${officeData.enhetNr}`
        );
    }

    return {
        enhetNr: officeData.enhetNr,
        navn: officeData.navn,
        type,
        telefonnummer: officeData.telefonnummer,
        telefonnummerKommentar: officeData.telefonnummerKommentar,
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

        // The kontaktinformasjoner-endpoint will not include the actual office type in its payload, so we need to
        // make a dictionary to look up the type from the office number.
        officeOverview.forEach((office) => officeTypeDictionary.set(office.enhetNr, office.type));

        const enhetnrForFetching = officeOverview
            .filter((office) => officeTypesForImport.has(office.type))
            .map((office) => office.enhetNr);

        const norgOffices = norgRequest<OfficeRawNORGData>({
            url: URLS.NORG_OFFICE_INFORMATION_API_URL,
            method: 'POST',
            body: JSON.stringify(enhetnrForFetching),
        });

        const officeBranches = norgRequest<OfficeRawNORGData>({
            url: URLS.NORG_LOCAL_OFFICE_API_URL,
            method: 'GET',
        });

        if (!norgOffices || !officeBranches) {
            logger.error(`OfficeImporting: Could not fetch offices or branch from norg2`);
            return;
        }

        const adaptedOffices = norgOffices.map((office) =>
            generalOfficeAdapter(office, officeTypeDictionary)
        );

        const adaptedOfficeBranches = officeBranches.map((office) => localOfficeAdapter(office));

        return [...adaptedOffices, ...adaptedOfficeBranches];
    } catch (e) {
        logger.error(`OfficeImporting: Exception from norg2 request: ${e}.`);
        return null;
    }
};

// Check if a path is taken by content with an invalid type
// (only office pages and internal redirects should be allowed)
const pathHasInvalidContent = (pathName: string) => {
    const existingContent = contentLib.get({ key: pathName });

    return (
        existingContent &&
        existingContent.type !== OFFICE_PAGE_CONTENT_TYPE &&
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

const getOfficeLanguage = (office: OfficeNorgData) => {
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
            (office) => office.type === OFFICE_PAGE_CONTENT_TYPE
        ) as Content<OfficePageDescriptor>[];
};

const moveAndRedirectOnNameChange = (
    prevOfficePage: Content<OfficePageDescriptor>,
    newOfficeData: OfficeNorgData
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
            includeDependencies: false,
        });
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to update office page name for ${prevOfficePage._path} - ${e}`
        );
    }
};

const mergeOfficeDataWithPageData = ({
    pageData,
    officeData,
    checksum,
}: {
    pageData: OfficePageData;
    officeData: OfficeNorgData;
    checksum: string;
}): OfficePageData => {
    return {
        ...pageData,
        title: officeData.navn,
        officeNorgData: {
            _selected: 'data',
            data: {
                ...officeData,
                checksum,
            },
        },
    };
};

const updateOfficePageIfChanged = (
    newOfficeData: OfficeNorgData,
    existingOfficePage: Content<OfficePageDescriptor>
) => {
    const newChecksum = createObjectChecksum(newOfficeData);

    if (
        newChecksum === existingOfficePage.data.officeNorgData.data.checksum &&
        newOfficeData.navn === existingOfficePage.displayName
    ) {
        return false;
    }

    try {
        moveAndRedirectOnNameChange(existingOfficePage, newOfficeData);

        contentLib.modify<OfficePageDescriptor>({
            key: existingOfficePage._id,
            editor: (content) => ({
                ...content,
                language: getOfficeLanguage(newOfficeData),
                displayName: newOfficeData.navn,
                data: mergeOfficeDataWithPageData({
                    pageData: content.data,
                    officeData: newOfficeData,
                    checksum: newChecksum,
                }),
            }),
        });

        return true;
    } catch (e) {
        logger.critical(
            `OfficeImporting: Failed to modify office page content ${existingOfficePage._path} - ${e}`
        );
        return false;
    }
};

const createOfficePage = (officeData: OfficeNorgData) => {
    const data = mergeOfficeDataWithPageData({
        pageData: {} as OfficePageData,
        officeData,
        checksum: createObjectChecksum(officeData),
    });

    const previewOnly = officeData.type !== 'LOKAL';

    try {
        const content = contentLib.create({
            name: getOfficeContentName(officeData),
            parentPath: OFFICES_BASE_PATH,
            displayName: officeData.navn,
            language: getOfficeLanguage(officeData),
            contentType: OFFICE_PAGE_CONTENT_TYPE,
            data,
            x: {
                'no-nav-navno': {
                    // Newly imported (created) office pages has to be checked by
                    // editors before being made public, so set previewOnly to true.
                    previewOnly: {
                        previewOnly,
                    },
                },
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
    existingOfficePages: Content<OfficePageDescriptor>[],
    validOfficeEnhetsNr: string[]
) => {
    const deletedIds: string[] = [];

    existingOfficePages.forEach((existingOffice) => {
        const { enhetNr } = existingOffice.data.officeNorgData.data;

        if (!validOfficeEnhetsNr.includes(enhetNr)) {
            const deletedId = deleteContent(existingOffice._id);
            if (deletedId) {
                deletedIds.push(deletedId);
            }
        }
    });

    return deletedIds;
};

export const processAllOffices = (offices: OfficeNorgData[]) => {
    const existingOffices = getExistingOfficePages();
    const processedOfficeEnhetsNr: string[] = [];

    const summary: { created: string[]; updated: string[]; deleted: string[] } = {
        created: [],
        updated: [],
        deleted: [],
    };

    offices.forEach((officePageData) => {
        const contentName = getOfficeContentName(officePageData);
        const pathName = `${OFFICES_BASE_PATH}/${contentName}`;

        if (pathHasInvalidContent(pathName)) {
            logger.info(`Found invalid content on ${pathName} - deleting`);
            deleteContent(pathName);
        }

        const existingOffice = existingOffices.find(
            (existingOffice) =>
                existingOffice.data?.officeNorgData?.data?.enhetNr === officePageData.enhetNr
        );

        if (existingOffice) {
            const wasUpdated = updateOfficePageIfChanged(officePageData, existingOffice);
            if (wasUpdated) {
                summary.updated.push(existingOffice._id);
            }
        } else {
            const createdId = createOfficePage(officePageData);
            if (createdId) {
                summary.created.push(createdId);
            }
        }

        processedOfficeEnhetsNr.push(officePageData.enhetNr);
    });

    summary.deleted = deleteStaleOfficePages(existingOffices, processedOfficeEnhetsNr);

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
