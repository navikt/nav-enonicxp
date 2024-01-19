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

const asAdminParams: Pick<Source, 'user' | 'principals'> = {
    user: {
        login: SUPER_USER,
    },
    principals: [ADMIN_PRINCIPAL],
};

type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };
type Publications = 'publish' | 'unpublishContent';

const getRepoConnection = ({ repoId, branch, asAdmin }: Params) =>
    nodeLib.connect({
        repoId,
        branch,
        ...(asAdmin && asAdminParams),
    });

const repoStr = (repoId: string) => repoId.replace('com.enonic.cms.', '');
const layerStr = (repo: string) => (repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '');

const prePublished = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];

const getUserPublications = (user: `user:${string}:${string}`, type: Publications) => {
    const fromDate = dayjs().subtract(6, 'months').toISOString();
    const results = auditLogLib.find({
        count: 5000,
        from: fromDate,
        type: `system.content.${type}`,
        users: [user],
    }) as any;

    // Get time in normalized format for dayjs (elastic has its own datetime format) and sort
    const entries = results.hits as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    entries.map((entry) => {
        const dayjsTime = dayjs(entry.time.substring(0, 19).replace('T', ' ')).utc(true).local();
        entry.time = dayjsTime.toString();
    });
    const allEntries = entries.sort((a, b) => (dayjs(a.time).isAfter(dayjs(b.time)) ? -1 : 1));

    // Remove duplicates and slice
    let i = 0;
    const duplicates = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    const check4Duplicates = (entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) => {
        const contentId = entry.data.params.contentIds as string;
        log.info(`[${++i}]:${contentId}`);
        return duplicates.find((duplicate) => {
            const dupCheckId = duplicate.data.params.contentIds as string;
            log.info(dupCheckId);
            return contentId === dupCheckId;
        });
    };
    log.info(allEntries.length);
    const lastEntries = allEntries
        .filter((entry) => {
            // Filter duplicates
            if (check4Duplicates(entry)) {
                return false;
            } else {
                duplicates.push(entry);
                return true;
            }
        })
        .filter((entry) => {
            // Filter and push entries for scheduled publish
            const publishTime = entry.data.params.from as string;

            if (!!entry.data.params.from && dayjs(entry.time).isAfter(publishTime)) {
                prePublished.push(entry);
                return false;
            }
            return true;
        })
        .slice(0, 5);
    log.info(duplicates.length);

    // Get content and generate the data model to the view
    return lastEntries.map((entry) => {
        const object = entry.objects[0];
        if (!object) {
            return undefined;
        }
        const repoId = object.split(':')[0];
        if (!repoId) {
            return undefined;
        }
        const contentId = entry.data.params.contentIds as string;
        if (!contentId) {
            return undefined;
        }
        const content = getRepoConnection({
            branch: 'draft',
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
                        values: [contentId],
                    },
                },
            })
            .hits.map((hit) =>
                getRepoConnection({
                    branch: 'draft',
                    repoId,
                }).get(hit.id)
            )[0]; // Only first published element in multi publications

        if (!content) {
            return null;
        }

        const repo = repoStr(repoId);
        const layer = layerStr(repo);
        return {
            displayName: content.displayName + layer,
            modifiedTimeStr: dayjs(entry.time).format('DD.MM.YYYY HH.mm.ss'),
            status: '',
            title: content._path.replace('/content/www.nav.no/', ''),
            url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/edit/${content._id}`,
        };
    });
};

const getLastContentFromUser = () => {
    const user = authLib.getUser()?.key;
    if (!user) {
        return null;
    }
    const view = resolve('./dashboard-content.html');

    // 1. Get 5 last published by user (and push to prePublish)
    const published = getUserPublications(user, 'publish');

    // 2. Get 5 last unpublished by user
    const unPublished = getUserPublications(user, 'unpublishContent');

    // 3. Fetch all localized content modified by current user, find status, sort and slice
    const repos = getLayersMultiConnection('draft');
    const modified = repos
        .query({
            count: 5000,
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
            const repo = repoStr(hit.repoId);
            const layer = layerStr(repo);

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

    return {
        body: thymeleafLib.render(view, { published, prePublished, modified, unPublished }),
        contentType: 'text/html',
    };
};

exports.get = getLastContentFromUser;
