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

const getRepoId = (entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) => {
    const object = entry.objects[0];
    if (!object) {
        return undefined;
    }
    return object.split(':')[0];
}
const repoStr = (repoId: string) => repoId.replace('com.enonic.cms.', '');
const layerStr = (repo: string) => (repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '');
const dayjsDateTime = (datetime: string) =>
    dayjs(datetime.substring(0, 19).replace('T', ' ')).utc(true).local();

const sortEntries = (entries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]) => {
    // Endre datoformat fra "Elastic spesial" og sorter
    entries.map((entry) => (entry.time = dayjsDateTime(entry.time).toString()));
    return entries.sort((a, b) => (dayjs(a.time).isAfter(dayjs(b.time)) ? -1 : 1));
}

const getContentFromLogEntries = (
    logEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[],
    publish: boolean
): ContentInfo[] => {
    const entries = logEntries.map((entry) => {
        const repoId = getRepoId(entry);
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
        const modifyDate = publish
            ? contentPublishInfo?.from || entry.time
            : contentPublishInfo?.to || entry.time;
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

const check4Duplicates = (entries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]) => {
        const duplicates = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
        return entries.filter((entry) =>
        {
            const contentId = entry.data.params.contentIds as string;
            const repoId = getRepoId(entry);
            const duplicate = duplicates
                .find((duplicate) => {
                    const dupCheckContentId = duplicate.data.params.contentIds as string;
                    return contentId === dupCheckContentId && repoId === getRepoId(duplicate);
                });
            if (duplicate) {
                // Duplikat, skal ikke være med
                return false;
            } else {
                // Ikke duplikat skal være med (og tas vare på for senere sjekk)
                duplicates.push(entry);
                return true;
            }
        });
};

const statusIsChanged = (
    entry: auditLogLib.LogEntry<auditLogLib.DefaultData>,
    published: boolean,
    statusEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]
):boolean => {
    const contentId = entry.data.params.contentIds as string;
    const repoId = getRepoId(entry);
    const contentPublishInfo = entry.data.params.contentPublishInfo as any;
    const prePublishDate = published ? contentPublishInfo?.from : contentPublishInfo?.to;

    return !!statusEntries.find((element) => {
        const dupCheckContentId = element.data.params.contentIds as string;
        if (contentId === dupCheckContentId && repoId === getRepoId(element)) {
            return dayjsDateTime(element.time).isAfter(dayjs(prePublishDate));
        }
        return false;
    });
}

const getUserPublications = (user: `user:${string}:${string}`) => {

    const fromDate = dayjs().subtract(1, 'months').toISOString(); // Går 6 måneder tilbake i tid
    const publishedLogEntries = auditLogLib.find({
        count: 1000,
        from: fromDate,
        type: 'system.content.publish',
        users: [user],
    }) as any;
    const unPublishedLogEntries = auditLogLib.find({
        count: 1000,
        from: fromDate,
        type: 'system.content.unpublishContent',
        users: [user],
    }) as any;

    // Sorter treff og fjern duplikater (innhold som er publisert/avpublisert flere ganger)
    let publishedEntries:auditLogLib.LogEntry<auditLogLib.DefaultData>[] =
        check4Duplicates(sortEntries(publishedLogEntries.hits));
    let unpublishedEntries:auditLogLib.LogEntry<auditLogLib.DefaultData>[] =
        check4Duplicates(sortEntries(unPublishedLogEntries.hits));
    let prePublishedEntries:auditLogLib.LogEntry<auditLogLib.DefaultData>[] = [];

    // Fjern forhåndspubliseringer fra publisert-listen og bygg forhåndspubliserings-listen
    publishedEntries = publishedEntries
        .filter((entry) => {
            // Filter and push entries for scheduled publish (prepublish)
            const contentPublishInfo = entry.data.params.contentPublishInfo as any;
            const prePublishDate = contentPublishInfo?.from;
            if ( prePublishDate ) {
                const isPublished = statusIsChanged(entry, true, publishedEntries);
                const isUnpublished = statusIsChanged(entry, false, unpublishedEntries);
                const prepublishDateExceeded = dayjs().isAfter(dayjsDateTime(prePublishDate));
                if (!isPublished && !isUnpublished && !prepublishDateExceeded) {
                    // Dette er en framtidig publisering
                    prePublishedEntries.push(entry);
                    return false;
                }
            }
            return true;
        });

    // Legg til forhåndspubliseringer som er gått ut på tid til avpublisert
    publishedEntries.forEach((entry) => {
        const contentPublishInfo = entry.data.params.contentPublishInfo as any;
        const publishToDate = contentPublishInfo?.to;
        if (publishToDate ) {
            if (dayjs().isAfter(dayjsDateTime(publishToDate))) {
                unpublishedEntries.push(entry);
            }
        }
    });
    // Sorter på nytt, fjern eventulle duplikater som har oppstått og kutt av til 5
    unpublishedEntries.sort((a, b) => {
        const aContentPublishInfo = a.data.params.contentPublishInfo as any;
        const bContentPublishInfo = b.data.params.contentPublishInfo as any;
        const aDate = aContentPublishInfo?.to || a.time;
        const bDate = bContentPublishInfo?.to || b.time;
        return (dayjs(aDate).isAfter(dayjs(bDate)) ? -1 : 1)
    });
    unpublishedEntries = check4Duplicates(unpublishedEntries).slice(0, 5);

    // Fjern publiseringer som allerede er avpublisert og kutt av til 5
    publishedEntries = publishedEntries.filter((entry) => {
        const contentId = entry.data.params.contentIds as string;
        const repoId = getRepoId(entry);
        const isUnpublished = unpublishedEntries
            .find((duplicate) => {
                const dupCheckContentId = duplicate.data.params.contentIds as string;
                if (contentId === dupCheckContentId && repoId === getRepoId(duplicate)) {
                    const dupPublishInfo = duplicate.data.params.contentPublishInfo as any
                    const dupPublishDate = dupPublishInfo?.to || duplicate.time;
                    log.info(entry.time + ' === ' + dupPublishDate )
                    return dayjsDateTime(dupPublishDate).isAfter(entry.time)
                }
            });
        return !isUnpublished;
    }).slice(0, 5);

    // Fjern forhåndspubliseringer som er avpublisert på tid
    prePublishedEntries = prePublishedEntries
        .filter((entry) => {
            const contentPublishInfo = entry.data.params.contentPublishInfo as any;
            const unpublishDate = contentPublishInfo?.to;
            if (unpublishDate) {
                return dayjsDateTime(unpublishDate).isAfter(dayjs());
            }
            return true;
        });

    // Må sortere prepublished på from-feltet
    prePublishedEntries = prePublishedEntries.sort((a, b) => {
        const aContentPublishInfo = a.data.params.contentPublishInfo as any;
        const bContentPublishInfo = b.data.params.contentPublishInfo as any;
        return (dayjs(aContentPublishInfo?.from).isAfter(dayjs(bContentPublishInfo?.from)) ? -1 : 1)
    });

    // Publisering eller forhåndspublisering av nyere dato skal ikke vises under avpublisert
    // unpublishedEntries.filter( published.find() )
    // unpublishedEntries.filter( prePublished.find() )
    // Lag funksjon:
    /*
        const filterEntries = (entries) => {
        entries.filter((entry) => {
        const contentId = entry.data.params.contentIds as string;
        const repoId = getRepoId(entry);
        const entryFound = entries
            .find((duplicate) => {
                const dupCheckContentId = duplicate.data.params.contentIds as string;
                if (contentId === dupCheckContentId && repoId === getRepoId(duplicate)) {
                    const dupPublishInfo = duplicate.data.params.contentPublishInfo as any
                    const dupPublishDate = dupPublishInfo?.to || duplicate.time;
                    log.info(entry.time + ' === ' + dupPublishDate )
                    return dayjsDateTime(dupPublishDate).isAfter(entry.time)
                }
            });
        return !entryFound;
     */

    // Returner content for alle tre typer
    const published = getContentFromLogEntries(publishedEntries, true);
    const prePublished = getContentFromLogEntries(prePublishedEntries, true);
    const unPublished = getContentFromLogEntries(unpublishedEntries, false);
    return {
        published,
        prePublished,
        unPublished
    }
};

const getUserModifications = (user: `user:${string}:${string}`) => {
    const repos = getLayersMultiConnection('draft');
    return repos.query({
        count: 5000,
        query: `modifier = "${user}"`,
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
            if (draftContent?._versionKey !== masterContent?._versionKey) {
                status = 'Endret';
            } else {
                return undefined;
            }
        } else if (draftContent?.publish?.first) {
            // Innholdet er IKKE publisert (er avpublisert), eventuelt endret etterpå
            if (draftContent?.workflow?.state === 'IN_PROGRESS') {
                status = 'Endret';
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
}
const getLastContentFromUser = () => {
    // Hent aktuell bruker (redaktør)
    const user = authLib.getUser()?.key;
    if (!user) {
        return null;
    }
    // Hent brukers publiseringer, forhåndspubliseringer og avpubliaseringer
    const { published, prePublished, unPublished } = getUserPublications(user);

    // Hent alt lokalisert innhold modifisert av bruker, finn status, sorter og avkort til 5
    const modified = getUserModifications(user);

    const view = resolve('./dashboard-content.html');

    return {
        body: thymeleafLib.render(view, { published, prePublished, modified, unPublished }),
        contentType: 'text/html',
    };
};

exports.get = getLastContentFromUser;
