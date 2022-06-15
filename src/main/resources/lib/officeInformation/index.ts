import contentLib, { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import commonLib from '/lib/xp/common';
import taskLib from '/lib/xp/task';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { OfficeInformation } from '../../site/content-types/office-information/office-information';
import { createObjectChecksum } from '../utils/nav-utils';
import { NavNoDescriptor } from '../../types/common';
import { UpdateOfficeInfoConfig } from '../../tasks/update-office-info/update-office-info-config';
import { logger } from '../utils/logging';
import { runInBranchContext } from '../utils/branch-context';

type OfficeInformationDescriptor = NavNoDescriptor<'office-information'>;

const officeInfoContentType: OfficeInformationDescriptor = `no.nav.navno:office-information`;
const parentPath = '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer';
const officeInfoUpdateTaskDescriptor = 'no.nav.navno:update-office-info';
const fiveMinutes = 5 * 60 * 1000;

const selectedEnhetTypes: { [key: string]: boolean } = {
    ALS: true,
    ARK: true,
    FPY: true,
    FYLKE: true,
    HMS: true,
    INTRO: true,
    KLAGE: true,
    KONTAKT: true,
    KONTROLL: true,
    LOKAL: true,
    OKONOMI: true,
    TILTAK: true,
    YTA: true,
    OPPFUTLAND: true,
};

// If non-office information content already exists on the path for an office, delete it
// (the main purpose of this is to get rid of redirects in the event of an office changing name
// to a name that was previously in use)
const deleteIfContentExists = (name: string) => {
    const updatedPath = `${parentPath}/${name}`;
    const existingContentOnPath = contentLib.get({ key: updatedPath });

    if (existingContentOnPath && existingContentOnPath.type !== officeInfoContentType) {
        logger.info(
            `Content already exists on path ${updatedPath} - deleting to make room for office page`
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

        // ignore closed offices and include only selected types
        if (enhet.status !== 'Nedlagt' && selectedEnhetTypes[enhet.type]) {
            officesInNorg[enhet.enhetId] = true;

            const updatedName = commonLib.sanitize(enhet.navn);
            deleteIfContentExists(updatedName);

            const existingOffice = existingOffices.find(
                (content) => content.data?.enhet?.enhetId === enhet.enhetId
            );

            // If the office page already exists, update the existing content
            if (existingOffice) {
                const existingChecksum = existingOffice.data.checksum;
                const updatedChecksum = createObjectChecksum(updatedOfficeData);

                if (
                    existingChecksum !== updatedChecksum ||
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
                            `Failed to modify office info content ${existingOffice._path} - ${e}`
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
                            },
                        });
                    } catch (e) {
                        logger.critical(
                            `Failed to updated office information name for ${existingOffice._path} - ${e}`
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
                    logger.critical(`Failed to create new office page for ${enhet.navn} - ${e}`);
                }
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
        sourceBranch: 'draft',
        targetBranch: 'master',
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

export const fetchAndUpdateOfficeInfo = (retry?: boolean) => {
    const newOfficeInfo = fetchOfficeInfo();
    if (!newOfficeInfo) {
        if (retry) {
            logger.error('Failed to fetch office info, retrying in 5 minutes');
            runOfficeInfoUpdateTask(false, new Date(Date.now() + fiveMinutes).toISOString());
        } else {
            logger.critical('Failed to fetch office info from norg2');
        }
        return;
    }

    logger.info('Fetched office info from norg2, updating site data...');

    runInBranchContext(() => updateOfficeInfo(newOfficeInfo), 'draft');
};

export const runOfficeInfoUpdateTask = (retry: boolean, scheduledTime?: string) => {
    if (scheduledTime) {
        createOrUpdateSchedule<UpdateOfficeInfoConfig>({
            jobName: 'office_info_update',
            jobDescription: 'Updates office info from norg',
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
        taskLib.submitTask<UpdateOfficeInfoConfig>({
            descriptor: officeInfoUpdateTaskDescriptor,
            config: {
                retry,
            },
        });
    }
};

export const startOfficeInfoPeriodicUpdateSchedule = () => {
    createOrUpdateSchedule<UpdateOfficeInfoConfig>({
        jobName: 'office_info_norg2_hourly',
        jobDescription: 'Updates office information from norg2 every hour',
        jobSchedule: {
            type: 'CRON',
            value: '15 * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: officeInfoUpdateTaskDescriptor,
        taskConfig: { retry: app.config.env !== 'localhost' },
    });
};
