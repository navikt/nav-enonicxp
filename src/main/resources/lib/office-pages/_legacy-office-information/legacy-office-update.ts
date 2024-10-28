import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import * as commonLib from '/lib/xp/common';
import * as taskLib from '/lib/xp/task';
import { createOrUpdateSchedule } from '../../scheduling/schedule-job';
import { OfficeInformation } from '@xp-types/site/content-types/office-information';
import { NavNoDescriptor } from '../../../types/common';
import { logger } from '../../utils/logging';
import { CONTENT_ROOT_REPO_ID, NORG2_CONSUMER_ID, URLS } from '../../constants';
import { createObjectChecksum } from '../../utils/object-utils';
import { runInContext } from '../../context/run-in-context';
import { UpdateOfficeInfo } from '@xp-types/tasks/update-office-info';
import { parseJsonToArray } from '../../utils/array-utils';

type OfficeInformationDescriptor = NavNoDescriptor<'office-information'>;

const officeInfoContentType: OfficeInformationDescriptor = `no.nav.navno:office-information`;
const parentPath = '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer';
const officeInfoUpdateTaskDescriptor = 'no.nav.navno:update-office-info';
const fiveMinutes = 5 * 60 * 1000;

const enhetTypesToImport: ReadonlySet<string> = new Set(['ALS', 'OKONOMI', 'OPPFUTLAND']);

// Always import these even if not in the set of types
const enhetNrToImport: ReadonlySet<string> = new Set([
    '4534', // [KONTROLL] NAV Registerforvaltning
    '4700', // [HMS] Styringsenheten for NAV Hjelpemidler og tilrettelegging
    '4712', // [HMS] Vestland-Bergen
    '4714', // [HMS] Vestland-Førde
    '4716', // [HMS] Trøndalag
]);

const shouldImportOffice = (enhet: OfficeInformation['enhet']) => {
    return (
        enhet.status?.toLowerCase() !== 'nedlagt' &&
        (enhetTypesToImport.has(enhet.type) || enhetNrToImport.has(enhet.enhetNr))
    );
};

// If non-office information content already exists on the path for an office, delete it
// (the main purpose of this is to get rid of redirects in the event of an office changing name
// to a name that was previously in use)
const deleteIfContentExists = (name: string) => {
    const updatedPath = `${parentPath}/${name}`;
    const existingContentOnPath = contentLib.get({ key: updatedPath });

    if (existingContentOnPath && existingContentOnPath.type !== officeInfoContentType) {
        logger.info(
            `Content already exists on legacy officer path ${updatedPath} - deleting to make room for office page`
        );

        // Move the content to a temp path first, as deletion does not seem to be a synchronous operation
        // We want to free up the source path immediately
        contentLib.move({
            source: existingContentOnPath._id,
            target: `${updatedPath}-delete`,
        });

        contentLib.delete({
            key: existingContentOnPath._id,
        });
    }
};

const updateOfficeInfo = (officeInformationUpdated: OfficeInformation[]) => {
    const existingOffices = contentLib
        .getChildren({
            key: parentPath,
            count: 2000,
        })
        .hits.filter(
            (office) => office.type === officeInfoContentType
        ) as Content<OfficeInformationDescriptor>[];

    const officesInNorg: { [key: number]: boolean } = {};

    const newOffices: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

    officeInformationUpdated.forEach((updatedOfficeData) => {
        const { enhet } = updatedOfficeData;

        if (!shouldImportOffice(enhet)) {
            return;
        }

        officesInNorg[enhet.enhetId] = true;

        const updatedName = commonLib.sanitize(enhet.navn);

        deleteIfContentExists(updatedName);

        const existingOffice = existingOffices.find(
            (content) => content.data?.enhet?.enhetId === enhet.enhetId
        );

        // If the office page already exists, update the existing content
        if (existingOffice) {
            const updatedChecksum = createObjectChecksum(updatedOfficeData);

            if (
                existingOffice.data.checksum !== updatedChecksum ||
                existingOffice.displayName !== enhet.navn
            ) {
                try {
                    contentLib.modify<OfficeInformationDescriptor>({
                        key: existingOffice._id,
                        editor: (content) => ({
                            ...content,
                            displayName: enhet.navn,
                            data: { ...updatedOfficeData, checksum: updatedChecksum },
                        }),
                    });
                    updated.push(existingOffice._path);
                } catch (e) {
                    logger.critical(
                        `Failed to modify legacy office info content ${existingOffice._path} - ${e}`
                    );
                }
            }

            const currentName = existingOffice._name;

            if (updatedName !== currentName) {
                try {
                    logger.info(`Updating name/path: ${currentName} -> ${updatedName}`);

                    // Move the office info page to a new path if the name changed
                    contentLib.move({
                        source: existingOffice._path,
                        target: updatedName,
                    });

                    // Create a redirect from the old path
                    contentLib.create<'no.nav.navno:internal-link'>({
                        name: currentName,
                        parentPath: parentPath,
                        displayName: `${existingOffice.displayName} (redirect til ${enhet.navn})`,
                        contentType: `${app.name}:internal-link`,
                        data: {
                            target: existingOffice._id,
                            permanentRedirect: false,
                            redirectSubpaths: false,
                        },
                    });
                } catch (e) {
                    logger.critical(
                        `Failed to updated legacy office information name for ${existingOffice._path} - ${e}`
                    );
                }
            }
        } else {
            try {
                const result = contentLib.create({
                    name: updatedName,
                    parentPath: parentPath,
                    displayName: enhet.navn,
                    contentType: officeInfoContentType,
                    data: {
                        ...updatedOfficeData,
                        checksum: createObjectChecksum(updatedOfficeData),
                    },
                });
                newOffices.push(result._path);
            } catch (e) {
                logger.critical(`Failed to create new legacy office page for ${enhet.navn} - ${e}`);
            }
        }
    });

    // delete old offices
    existingOffices.forEach((existingOffice) => {
        const enhetId = existingOffice?.data?.enhet?.enhetId;
        if (!officesInNorg[enhetId]) {
            deleted.push(existingOffice._path);
            contentLib.delete({
                key: existingOffice._id,
            });
        }
    });

    // Publish updates
    contentLib.publish({
        keys: [parentPath],
        includeDependencies: true,
    });

    logger.info(
        `NORG - Updated: ${updated.length} New: ${newOffices.length} Deleted: ${deleted.length}`
    );
    if (updated.length > 0) {
        logger.info(`Updated: ${JSON.stringify(updated, null, 4)}`);
    }
    if (newOffices.length > 0) {
        logger.info(`New: ${JSON.stringify(newOffices, null, 4)}`);
    }
    if (deleted.length > 0) {
        logger.info(`Deleted: ${JSON.stringify(deleted, null, 4)}`);
    }
};

const fetchOfficeInfo = () => {
    try {
        const response = httpClient.request({
            url: URLS.NORG_LEGACY_OFFICE_INFORMATION_API_URL,
            method: 'GET',
            headers: {
                consumerId: NORG2_CONSUMER_ID,
            },
        });

        if (response.status === 200 && response.body) {
            return parseJsonToArray<OfficeInformation>(response.body);
        } else {
            logger.error(
                `Bad response from legacy norg2: ${response.status} - ${response.message}`
            );
            return null;
        }
    } catch (e) {
        logger.error(`Exception from legacy norg2 request: ${e}`);
        return null;
    }
};

const cleanOfficeInfo = (officeInfo: OfficeInformation[]): OfficeInformation[] => {
    return officeInfo.map((entry) => {
        // enhet.sosialeTjenester may contain data meant for internal use only
        // and should not be exposed to the public in any way
        return { ...entry, enhet: { ...entry.enhet, sosialeTjenester: undefined } };
    });
};

export const fetchAndUpdateOfficeInfo = (retry?: boolean) => {
    const newOfficeInfo = fetchOfficeInfo();
    if (!newOfficeInfo) {
        if (retry) {
            logger.error('Failed to fetch legacy office info, retrying in 5 minutes');
            runOfficeInfoUpdateTask(false, new Date(Date.now() + fiveMinutes).toISOString());
        } else {
            logger.error('Failed to fetch legacy office info from norg2');
        }
        return;
    }

    logger.info('Fetched legacy office info from norg2, updating site data...');

    const cleanedOfficeInfo = cleanOfficeInfo(newOfficeInfo);

    runInContext(
        {
            branch: 'draft',
            repository: CONTENT_ROOT_REPO_ID,
            asAdmin: true,
        },
        () => updateOfficeInfo(cleanedOfficeInfo)
    );
};

export const runOfficeInfoUpdateTask = (retry: boolean, scheduledTime?: string) => {
    if (scheduledTime) {
        createOrUpdateSchedule<UpdateOfficeInfo>({
            jobName: 'office_info_update',
            jobDescription: 'Updates legacy office info from norg',
            taskDescriptor: officeInfoUpdateTaskDescriptor,
            jobSchedule: {
                type: 'ONE_TIME',
                value: scheduledTime,
            },
            taskConfig: {
                retry,
            },
            masterOnly: false,
        });
    } else {
        taskLib.submitTask<UpdateOfficeInfo>({
            descriptor: officeInfoUpdateTaskDescriptor,
            config: {
                retry,
            },
        });
    }
};

export const startOfficeInfoPeriodicUpdateSchedule = () => {
    createOrUpdateSchedule<UpdateOfficeInfo>({
        jobName: 'office_info_norg2_hourly',
        jobDescription: 'Updates legacy office information from norg2 every hour',
        jobSchedule: {
            type: 'CRON',
            value: '*/10 * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: officeInfoUpdateTaskDescriptor,
        taskConfig: { retry: app.config.env !== 'localhost' },
    });
};
