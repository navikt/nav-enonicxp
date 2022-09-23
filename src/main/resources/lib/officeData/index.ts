import contentLib, { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import commonLib from '/lib/xp/common';
import taskLib from '/lib/xp/task';
import contextLib from '/lib/xp/context';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { OfficeData } from '../../site/content-types/office-data/office-data';
import { createObjectChecksum } from '../utils/nav-utils';
import { NavNoDescriptor } from '../../types/common';
import { UpdateOfficeDataConfig } from '../../tasks/update-office-data/update-office-data-config';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';

type OfficeDataDescriptor = NavNoDescriptor<'office-data'>;

const officeDataContentType: OfficeDataDescriptor = `no.nav.navno:office-data`;
const parentPath = '/www.nav.no/person/kontor-data';
const officeDataUpdateTaskDescriptor = 'no.nav.navno:update-office-data';
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

// If non-office data content already exists on the path for an office, delete it
// (the main purpose of this is to get rid of redirects in the event of an office changing name
// to a name that was previously in use)
const deleteIfContentExists = (name: string) => {
    const updatedPath = `${parentPath}/${name}`;
    const existingContentOnPath = contentLib.get({ key: updatedPath });

    if (existingContentOnPath && existingContentOnPath.type !== officeDataContentType) {
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

const updateOfficeData = (officeDataUpdated: OfficeData[]) => {
    const existingOffices = contentLib
        .getChildren({
            key: parentPath,
            count: 2000,
        })
        .hits.filter(
            (office) => office.type === officeDataContentType
        ) as Content<OfficeDataDescriptor>[];

    const officesInNorg: { [key: number]: boolean } = {};

    const newOffices: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

    officeDataUpdated.forEach((updatedOfficeData) => {
        const { enhet } = updatedOfficeData;

        // ignore closed offices and include only selected types
        if (enhet.status === 'Nedlagt' || !selectedEnhetTypes[enhet.type]) {
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
                    contentLib.modify<OfficeDataDescriptor>({
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
                        `Failed to modify office data content ${existingOffice._path} - ${e}`
                    );
                }
            }

            const currentName = existingOffice._name;

            if (updatedName !== currentName) {
                try {
                    logger.info(`Updating name/path: ${currentName} -> ${updatedName}`);

                    // Move the office data page to a new path if the name changed
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
                        `Failed to updated office data name for ${existingOffice._path} - ${e}`
                    );
                }
            }
        } else {
            try {
                const result = contentLib.create({
                    name: updatedName,
                    parentPath: parentPath,
                    displayName: enhet.navn,
                    contentType: officeDataContentType,
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

const fetchOfficeData = () => {
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

export const fetchAndUpdateOfficeData = (retry?: boolean) => {
    const newOfficeData = fetchOfficeData();
    if (!newOfficeData) {
        if (retry) {
            logger.error('Failed to fetch office data, retrying in 5 minutes');
            runOfficeDataUpdateTask(false, new Date(Date.now() + fiveMinutes).toISOString());
        } else {
            logger.critical('Failed to fetch office data from norg2');
        }
        return;
    }

    logger.info('Fetched office data from norg2, updating site data...');

    contextLib.run(
        {
            repository: contentRepo,
            user: {
                login: 'su',
                idProvider: 'system',
            },
            principals: ['role:system.admin'],
        },
        () => updateOfficeData(newOfficeData)
    );
};

export const runOfficeDataUpdateTask = (retry: boolean, scheduledTime?: string) => {
    if (scheduledTime) {
        createOrUpdateSchedule<UpdateOfficeDataConfig>({
            jobName: 'office_data_update',
            jobDescription: 'Updates office data from norg',
            taskDescriptor: officeDataUpdateTaskDescriptor,
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
        taskLib.submitTask<UpdateOfficeDataConfig>({
            descriptor: officeDataUpdateTaskDescriptor,
            config: {
                retry,
            },
        });
    }
};

export const startOfficeDataPeriodicUpdateSchedule = () => {
    createOrUpdateSchedule<UpdateOfficeDataConfig>({
        jobName: 'office_data_norg2_hourly',
        jobDescription: 'Updates office data from norg2 every hour',
        jobSchedule: {
            type: 'CRON',
            value: '50 * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: officeDataUpdateTaskDescriptor,
        taskConfig: { retry: app.config.env !== 'localhost' },
    });
};
