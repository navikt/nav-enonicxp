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
const removeUndefined = <S>(value: S | undefined): value is S => value !== undefined;
type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };
type Publications = 'publish' | 'unpublishContent';
type ContentInfo =
    {
          displayName: string;
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

const repoStr = (repoId: string) => repoId.replace('com.enonic.cms.', '');
const layerStr = (repo: string) => (repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '');
const dayjsDateTime = (datetime: string) =>
    dayjs(datetime.substring(0, 19).replace('T', ' ')).utc(true).local();

// Tabeller for prepublished brukes av flere funksoner og må derfor deklareres globalt.
let prePublishedLogEntries = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
let prePublished: ContentInfo[] = [];

const getUserPublications = (user: `user:${string}:${string}`, type: Publications) => {
    // Function to enerate datamodel for log entries (publish/unpublish/prepublish)
    const getContentFromLogEntries = (
        logEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[],
        prepublish: boolean
    ): ContentInfo[] => {
        const entries = logEntries.map((entry) => {
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
                return undefined;
            }

            const repo = repoStr(repoId);
            const layer = layerStr(repo);
            const contentPublishInfo = entry.data.params?.contentPublishInfo as any;
            const modifyDate = prepublish ? contentPublishInfo?.from : entry.time;
            return {
                displayName: content.displayName + layer,
                modifiedTimeStr: dayjs(modifyDate).format('DD.MM.YYYY HH.mm.ss'),
                status: '',
                title: content._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/edit/${content._id}`,
            };
        });

        return entries.filter(removeUndefined);
    };

    const fromDate = dayjs().subtract(6, 'months').toISOString();
    // Get users entries in AuditLog from the last 6 month
    const results = auditLogLib.find({
        count: 5000,
        from: fromDate,
        type: `system.content.${type}`,
        users: [user],
    }) as any;

    // Get time in normalized format for dayjs (elastic has its own datetime format) and sort
    const entries = results.hits as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    entries.map((entry) => (entry.time = dayjsDateTime(entry.time).toString()));
    const allEntries = entries.sort((a, b) => (dayjs(a.time).isAfter(dayjs(b.time)) ? -1 : 1));

    // Remove duplicates (published or unpublished more than once), check for prepublish and slice
    const duplicates = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    const check4Duplicates = (entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) => {
        const contentId = entry.data.params.contentIds as string;

        return duplicates.find((duplicate) => {
            const dupCheckId = duplicate.data.params.contentIds as string;
            return contentId === dupCheckId;
        });
    };
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
            if (type === 'publish') {
                // Filter and push entries for scheduled publish (prepublish)
                const contentPublishInfo = entry.data.params.contentPublishInfo as any;
                const publishTime = contentPublishInfo?.from;
                if (publishTime) {
                    if (dayjsDateTime(publishTime).isAfter(dayjs())) {
                        // This entry is scheduled, push to prePublished entries
                        prePublishedLogEntries.push(entry);
                        return false;
                    }
                }
            }
            return true;
        })
        .filter(removeUndefined)
        .slice(0, 5);

    // Get content for prepublish
    if (type === 'publish') {
        prePublished = getContentFromLogEntries(prePublishedLogEntries, true)
            .sort((a, b) => (dayjs(a.modifiedTimeStr).isAfter(dayjs(b.modifiedTimeStr)) ? -1 : 1));
    }
    // Get content
    return getContentFromLogEntries(lastEntries, false);
};

const getLastContentFromUser = () => {
    const user = authLib.getUser()?.key;
    if (!user) {
        return null;
    }
    const view = resolve('./dashboard-content.html');
    prePublishedLogEntries = [];

    // 1. Get 5 last published by user + all prepublished (pushed to prePublished[])
    const published = getUserPublications(user, 'publish');

    // 2. Get 5 last unpublished by user
    const unPublished = getUserPublications(user, 'unpublishContent');

    // 3. Fetch all localized content modified by user, find status, sort and slice
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
            const modifiedLocalTime = dayjsDateTime(draftContent._ts);
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
