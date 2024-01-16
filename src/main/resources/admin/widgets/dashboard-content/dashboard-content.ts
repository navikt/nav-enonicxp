import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import * as auditLogLib from '/lib/xp/auditlog';
import { Source } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, SUPER_USER } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import { dynamicPageContentTypes, legacyPageContentTypes } from '../../../lib/contenttype-lists';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import utc from '/assets/dayjs/1.11.9/plugin/utc.js';

dayjs.extend(utc);

const fromDate = dayjs().subtract(1, 'months').toISOString();

const asAdminParams: Pick<Source, 'user' | 'principals'> = {
    user: {
        login: SUPER_USER,
    },
    principals: [ADMIN_PRINCIPAL],
};

type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };
type Publications = 'publish' | 'unpublishContent';
type ContentInfo = {
    displayName: string;
    modifiedTime: dayjs.Dayjs;
    modifiedTimeStr: string;
    status: string;
    title: string;
    url: string;
};

const getRepoConnection = ({ repoId, branch, asAdmin }: Params) =>
    nodeLib.connect({
        repoId,
        branch,
        ...(asAdmin && asAdminParams),
    });

const getUserPublications = (user: `user:${string}:${string}`, type: Publications) => {
    const branch = {
        publish: 'master',
        unpublishContent: 'draft',
    } as const;
    const status = {
        publish: 'publish',
        unpublishContent: 'unpublish',
    } as const;
    const result = auditLogLib.find({
        count: 1000,
        from: fromDate,
        type: `system.content.${type}`,
        users: [user],
    }) as any;

    log.info(`*** Type: ${type} ***`);
    const entries = result.hits as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    entries.map((entry) => {
        const dayjsTime = dayjs(entry.time.substring(0, 19).replace('T', ' ')).utc(true).local();
        entry.time = dayjsTime.toString();
    });
    const lastEntries = entries
        .sort((a, b) => (dayjs(a.time).isAfter(dayjs(b.time)) ? -1 : 1))
        .slice(0, 5);

    log.info(JSON.stringify(lastEntries, null, 4));

    return lastEntries.map((entry) => {
        const object = entry.objects[0];
        if (!object) {
            return null;
        }
        const repoId = object.split(':')[0];
        if (!repoId) {
            return null;
        }
        const contentId = entry.data.params.contentIds as string;
        if (!contentId) {
            return null;
        }
        const content = getRepoConnection({
            branch: branch[type],
            repoId,
        })
            .query({
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'type',
                                values: [...legacyPageContentTypes, ...dynamicPageContentTypes],
                            },
                        },
                    },
                    ids: {
                        values: [contentId], // Only first published element in multipublications
                    },
                },
            })
            .hits.map((hit) =>
                getRepoConnection({
                    branch: branch[type], // Ble hardkodet til draft
                    repoId,
                }).get(hit.id)
            )[0];
        if (!content) {
            return null;
        }
        log.info('------- content start --------');
        log.info(content._ts);
        log.info(content.displayName);
        log.info('------- content slutt --------');

        const modifiedLocalTime = dayjs(content._ts.substring(0, 19).replace('T', ' '))
            .utc(true)
            .local();
        const repo = repoId.replace('com.enonic.cms.', '');
        const layer = repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '';

        return {
            displayName: content.displayName + layer,
            modifiedTime: modifiedLocalTime,
            modifiedTimeStr: dayjs(modifiedLocalTime).format('DD.MM.YYYY HH.mm.ss'),
            status: status[type],
            title: content._path.replace('/content/www.nav.no/', ''),
            url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/edit/${content._id}`,
        };
    });
};

const getModifiedContentFromUser = () => {
    const user = authLib.getUser()?.key;
    if (!user) {
        return null;
    }
    const view = resolve('./dashboard-content.html');

    // 1. Get 5 last published by user
    const published = getUserPublications(user, 'publish');

    // 2. Get 5 last unpublished by user
    const unPublished = getUserPublications(user, 'unpublishContent');

    // 3a. Fetch all localized content modified by current user, find status and sort
    const repos = getLayersMultiConnection('draft');
    const modified = repos
        .query({
            count: 1000,
            query: `modifier = "${user}" AND type LIKE "no.nav.navno:*"`,
            filters: {
                boolean: {
                    mustNot: NON_LOCALIZED_QUERY_FILTER,
                    must: {
                        hasValue: {
                            field: 'type',
                            values: [...legacyPageContentTypes, ...dynamicPageContentTypes],
                        },
                    },
                },
            },
        })
        .hits.map((hit) => {
            const draftContent = getRepoConnection({
                branch: 'draft',
                repoId: hit.repoId,
            }).get(hit.id);
            const masterContent = getRepoConnection({
                branch: 'master',
                repoId: hit.repoId,
            }).get(hit.id);

            if (!draftContent) {
                return undefined;
            }

            // modifiedTime med sekunder
            const modifiedStr = draftContent._ts.substring(0, 19).replace('T', ' ');

            if (!draftContent.displayName) {
                draftContent.displayName = 'Uten tittel';
            }

            let status = 'Ny';

            if (masterContent?.publish?.first && masterContent?.publish?.from) {
                // Innholdet ER publisert, eventuelt endret etterpå
                if (draftContent?._versionKey === masterContent?._versionKey) {
                    return undefined;
                } else {
                    status = 'Endret';
                }
            } else if (draftContent?.publish?.first) {
                // Innholdet er IKKE publisert (er avpublisert), eventuelt endret etterpå

                if (draftContent?.workflow?.state === 'IN_PROGRESS') {
                    status = 'Endret';
                } else if (draftContent?.archivedTime) {
                    status = 'Arkivert';
                } else {
                    return undefined;
                }
            }
            const modifiedLocalTime = dayjs(modifiedStr).utc(true).local();
            const repo = hit.repoId.replace('com.enonic.cms.', '');
            const layer = repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '';

            return {
                displayName: draftContent.displayName + layer,
                modifiedTime: modifiedLocalTime,
                modifiedTimeStr: dayjs(modifiedLocalTime).format('DD.MM.YYYY HH.mm.ss'),
                status,
                title: draftContent._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/edit/${draftContent._id}`,
            };
        })
        .filter((entry) => !!entry)
        .sort((a, b) => (dayjs(a?.modifiedTime).isAfter(dayjs(b?.modifiedTime)) ? -1 : 1))
        .slice(0, 5);

    log.info('--- modified ---');
    modified.forEach((content) => {
        if (content) log.info(JSON.stringify(content.displayName, null, 4));
    });

    return {
        body: thymeleafLib.render(view, { published, modified, unPublished }),
        contentType: 'text/html',
    };
};

exports.get = getModifiedContentFromUser;
