import contentLib, { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import commonLib from '/lib/xp/common';
import { createOrModifySchedule } from '../utils/scheduler';
import { OfficeInformation } from '../../site/content-types/office-information/office-information';
import { createObjectChecksum } from '../utils/nav-utils';
import { CustomContentDescriptor } from '../../types/content-types/content-config';

const parentPath = '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer';
const officeInfoContentType: CustomContentDescriptor = `no.nav.navno:office-information`;

type OfficeInformationType = typeof officeInfoContentType;

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

const logger = {
    info: (message: string) => log.info(`[office information] ${message}`),
    warning: (message: string) => log.warning(`[office information] ${message}`),
    error: (message: string) => log.error(`[office information] ${message}`),
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

const refreshOfficeInfo = (officeInformationUpdated: OfficeInformation[]) => {
    const existingOffices = contentLib
        .getChildren({
            key: parentPath,
            count: 2000,
        })
        .hits.filter(
            (office) => office.type === officeInfoContentType
        ) as Content<OfficeInformationType>[];

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

            // if the office page already exists, update the existing content
            if (existingOffice) {
                const existingChecksum = createObjectChecksum(existingOffice.data);
                const updatedChecksum = createObjectChecksum(updatedOfficeData);

                if (
                    existingChecksum !== updatedChecksum ||
                    existingOffice.displayName !== enhet.navn
                ) {
                    updated.push(existingOffice._path);
                    contentLib.modify<OfficeInformationType>({
                        key: existingOffice._id,
                        editor: (content) => ({
                            ...content,
                            displayName: enhet.navn,
                            data: updatedOfficeData,
                        }),
                    });
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
                        logger.error(`Failed to updated office information name: ${e}`);
                    }
                }
            } else {
                try {
                    const result = contentLib.create({
                        name: updatedName,
                        parentPath: parentPath,
                        displayName: enhet.navn,
                        contentType: officeInfoContentType,
                        data: updatedOfficeData,
                    });
                    newOffices.push(result._path);
                } catch (e) {
                    logger.error(`Failed to create new office page - ${e}`);
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

        if (response.body) {
            return JSON.parse(response.body);

            // logger.info('NORG - Publish office information');
            // contentLib.publish({
            //     keys: ['/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer'],
            //     sourceBranch: 'draft',
            //     targetBranch: 'master',
            //     includeDependencies: true,
            // });
        } else {
            logger.error(`Error response from norg2: ${response.status} - ${response.message}`);
            return null;
        }
    } catch (e) {
        logger.error(`Exception from norg2 request: ${e}`);
        return null;
    }
};

export const updateOfficeInfo = () => {
    const newOfficeInfo = fetchOfficeInfo();
    if (!newOfficeInfo) {
        logger.error('Failed to fetch office info!');
        return;
    }
    logger.info('Fetch successful!');

    refreshOfficeInfo(newOfficeInfo);
};

export const startOfficeInfoSchedule = () => {
    createOrModifySchedule({
        jobName: 'office_info_norg2_hourly',
        jobDescription: 'Updates office information from norg2 every hour',
        jobSchedule: {
            type: 'CRON',
            value: '* * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: 'no.nav.navno:get-office-info',
    });
};
