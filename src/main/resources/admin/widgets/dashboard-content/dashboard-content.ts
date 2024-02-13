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
const fromDate = dayjs().subtract(6, 'months').toISOString(); // Går bare 6 måneder tilbake i tid

const asAdminParams: Pick<Source, 'user' | 'principals'> = {
    user: {
        login: SUPER_USER,
    },
    principals: [ADMIN_PRINCIPAL],
};
const removeUndefined = <S>(value: S | undefined): value is S => value !== undefined;
type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };
type ContentInfo = {
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
};
const repoStr = (repoId: string) => repoId.replace('com.enonic.cms.', '');
const layerStr = (repo: string) => (repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '');
const dayjsDateTime = (datetime: string) =>
    datetime && dayjs(datetime.substring(0, 19).replace('T', ' ')).utc(true).local();

const sortEntries = (entries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]) => {
    // Endre datoformat fra "Elastic spesial" og sorter
    if (!entries) {
        return [];
    }
    entries.map((entry) => (entry.time = dayjsDateTime(entry.time).toString()));
    return entries.sort((a, b) => (dayjs(a.time).isAfter(dayjs(b.time)) ? -1 : 1));
};

const getContentFromLogEntries = (
    logEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[],
    publish: boolean
): ContentInfo[] => {
    const entries = logEntries.map((entry) => {
        const repoId = getRepoId(entry);
        if (!repoId) {
            return undefined;
        }
        const contentId = entry.data.params?.contentIds as string || entry.data.params?.contentId as string;
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
            )[0];

        if (!content) {
            // Innhold finnes ikke (er slettet) etter er ikke "våre" innholdtyper
            return undefined;
        }

        const repo = repoStr(repoId);
        const layer = layerStr(repo);
        let status = '', modifyDate, contentUrl;
        if (content?.archivedTime) {
            status = 'Arkivert';
            modifyDate = dayjsDateTime(content.archivedTime);
            contentUrl = 'widget/plus/archive'; // Viser til arkivet (kan ikke gå direkte til aktuelt innhold)
        } else {
            const contentPublishInfo = entry.data.params?.contentPublishInfo as any;
            modifyDate = publish
                ? contentPublishInfo?.from || entry.time
                : contentPublishInfo?.to || entry.time;
            contentUrl = `edit/${content._id}`;
        }
        return {
            displayName: content.displayName + layer,
            modifiedTimeStr: dayjs(modifyDate).format('DD.MM.YYYY HH.mm.ss'),
            status,
            title: content._path.replace('/content/www.nav.no/', ''),
            url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/${contentUrl}`,
        };
    });

    // Fjern tomme elementer (slette/ikke våre innholdstyper), og kutt av til 5
    return entries.filter(removeUndefined).slice(0, 5);
};

const check4Duplicates = (entries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]) => {
    const duplicates = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    return entries.filter((entry) => {
        const contentId =
            entry.data.params.contentIds as string ||
            entry.data.params.contentId as string;
        const repoId = getRepoId(entry);
        const duplicate = duplicates.find((duplicate) => {
            const dupCheckContentId =
                duplicate.data.params.contentIds as string ||
                duplicate.data.params.contentId as string;
            return contentId === dupCheckContentId && repoId === getRepoId(duplicate);
        });
        if (duplicate) {
            return false;
        } else {
            duplicates.push(entry);
            return true;
        }
    });
};

const newerEntryFound = (
    entry: auditLogLib.LogEntry<auditLogLib.DefaultData>,
    list: auditLogLib.LogEntry<auditLogLib.DefaultData>[]
) => {
    const contentId =
        entry.data.params.contentIds as string ||
        entry.data.params.contentId as string;
    const repoId = getRepoId(entry);
    return list.find((listEntry) => {
        const listEntryContentId =
            listEntry.data.params.contentIds as string ||
            listEntry.data.params.contentId as string;
        if (contentId === listEntryContentId && repoId === getRepoId(listEntry)) {
            return dayjs(listEntry.time).isAfter(entry.time);
        }
    });
};

// Hent alle brukers siste publiseringer, inkludert forhåndspubliseringer og avpubliseringer
const getUsersPublications = (user: `user:${string}:${string}`) => {
    const logEntries = auditLogLib.find({
        count: 5000,
        from: fromDate,
        users: [user],
    });
    // @ts-ignore
    const publishedLogEntries = logEntries.hits.filter((entry) => entry.type === 'system.content.publish');
    // @ts-ignore
    const unpublishedLogEntries = logEntries.hits.filter((entry) => entry.type === 'system.content.unpublishContent');
    // @ts-ignore
    const archivedLogEntries = logEntries.hits.filter((entry) => entry.type === 'system.content.archive');

    // Gjennomgå arkivert-listen for eventuelt å legge til i avpublisert
    archivedLogEntries.forEach((entry:auditLogLib.LogEntry<auditLogLib.DefaultData>) => {
        if (entry.data.result?.unpublishedContents) {
            // Innholdet er arkivert uten å være avpublisert først, legg til i avpublisert før behandling
            unpublishedLogEntries.push(entry)
        }
    });

    // Sorter treff og fjern duplikater (innhold som er publisert/avpublisert flere ganger)
    let publishedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = check4Duplicates(
        sortEntries(publishedLogEntries)
    );
    let unpublishedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = check4Duplicates(
        sortEntries(unpublishedLogEntries)
    );

    // Listen for forhåndspublisering bygges opp under gjennomgang av publiserte
    let prePublishedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = [];

    // Gjennomgå publiseringerer - kan være en av følgende:
    // 0.  Publisering som er arkivert senere
    // 1a. Vanlig publisering som er aktiv
    // 1b. Vanlig pubsliering som ikke aktiv lenger (avpublisert)
    // 2a. Forhåndspublisering som er aktiv (publisert nå)
    // 2b. Forhåndspublisering som ikke er aktiv ennå - (from) er ikke nådd OG ikke avpublisert etterpå
    // 2c. Forhåndspublisering som er avpublisert etterpå
    // 2d. Forhåndspublisering som ikke er aktiv lenger - (to) har passert
    publishedEntries = publishedEntries.filter((entry) => {
        // Må sjekke om denne er arkivert senere
        if (newerEntryFound(entry, archivedLogEntries)) {
            return false; // 0. Er arkivert
        }
        const contentPublishInfo = entry.data.params.contentPublishInfo as any;
        const publishFromDate = dayjsDateTime(contentPublishInfo?.from);
        const publishToDate = dayjsDateTime(contentPublishInfo?.to);
        if (publishFromDate) {
            // 2. Dette er en forhåndspublisering (from)
            // Må sjekke om det er avpublisert etterpå
            const unpublishedLater = newerEntryFound(entry, unpublishedEntries);
            if (!unpublishedLater) {
                const prepublishDateExceeded = dayjs().isAfter(publishFromDate);
                if (!prepublishDateExceeded) {
                    // 2b. - skal vises i forhåndspublisert-listen
                    prePublishedEntries.push(entry);
                    return false;
                }
                if (publishToDate) {
                    // Dette er en forhåndspublisering med gyldighetstid (to)
                    const unpublishDateExceeded = dayjs().isAfter(publishToDate);
                    if (unpublishDateExceeded) {
                        // 2d. Har utløpt på tid - skal vises i avpublisert-listen
                        unpublishedEntries.push(entry);
                        return false;
                    }
                }
                // 2a. Er publisert
                return true;
            } else {
                // 2c. Er avpublisert
                return false;
            }
        }
        // Dette er en publisering - 1.
        // Fjern fra listen hvis den er avpublisert etterpå - 1b.
        const unpublishedLater = newerEntryFound(entry, unpublishedEntries);
        return !unpublishedLater; // True: 1a. - False: 1b.
    });

    // Sorter publisert på nytt på (for å sikre riktig rekkefølge ved forhåndspublisering (from)
    publishedEntries = publishedEntries
        .sort((a, b) => {
            const aContentPublishInfo = a.data.params.contentPublishInfo as any;
            const bContentPublishInfo = b.data.params.contentPublishInfo as any;
            const aDate = aContentPublishInfo?.from || a.time;
            const bDate = bContentPublishInfo?.from || b.time;
            return dayjs(aDate).isAfter(dayjs(bDate)) ? -1 : 1;
        });

    // Sorter avpublisert på nytt, fjern eventulle duplikater som har oppstått
    unpublishedEntries.sort((a, b) => {
        const aContentPublishInfo = a.data.params.contentPublishInfo as any;
        const bContentPublishInfo = b.data.params.contentPublishInfo as any;
        const aDate = aContentPublishInfo?.to || a.time;
        const bDate = bContentPublishInfo?.to || b.time;
        return dayjs(aDate).isAfter(dayjs(bDate)) ? -1 : 1;
    });
    unpublishedEntries = check4Duplicates(unpublishedEntries);

    // Fjern fra avpublisert hvis publisering eller forhåndspublisering av nyere dato
    unpublishedEntries = unpublishedEntries
        .filter((entry) => {
            const contentId = entry.data.params.contentIds as string;
            const repoId = getRepoId(entry);
            const publishedLater = newerEntryFound(entry, publishedEntries);
            const prePublishedLater = prePublishedEntries.find((duplicate) => {
                const dupCheckContentId = duplicate.data.params.contentIds as string;
                if (contentId === dupCheckContentId && repoId === getRepoId(duplicate)) {
                    const contentPublishInfo = entry.data.params.contentPublishInfo as any;
                    const publishFromDate = dayjsDateTime(contentPublishInfo?.from);
                    return dayjs(publishFromDate).isAfter(entry.time);
                }
            });
            return !publishedLater && !prePublishedLater;
        });

    // Må sortere prepublished på from-feltet
    prePublishedEntries = prePublishedEntries.sort((a, b) => {
        const aContentPublishInfo = a.data.params.contentPublishInfo as any;
        const bContentPublishInfo = b.data.params.contentPublishInfo as any;
        return dayjs(aContentPublishInfo?.from).isAfter(dayjs(bContentPublishInfo?.from)) ? -1 : 1;
    });

    // Returner content for alle tre typer
    const published = getContentFromLogEntries(publishedEntries, true);
    const prePublished = getContentFromLogEntries(prePublishedEntries, true);
    const unPublished = getContentFromLogEntries(unpublishedEntries, false);
    return {
        published,
        prePublished,
        unPublished,
    };
};

// Hent brukers endringer av innhold siste 6 måneder (bare lokalisert innhold av "våre" innholdsyper)
const getUsersModifications = (user: `user:${string}:${string}`) => {
    const repos = getLayersMultiConnection('draft');
    return repos
        .query({
            count: 5000,
            query: `modifier = '${user}' AND range('modifiedTime', instant('${fromDate}'), '')`,
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
                    // Publisert, men endret etterpå
                    status = 'Endret';
                } else {
                    // Publisert, skal ikke vises her
                    return undefined;
                }
            } else if (draftContent?.archivedTime) {
                // Arkivert, skal ikke vises her
                return undefined;
            } else if (draftContent?.publish?.first) {
                // Avpublisert, eventuelt endret etterpå
                if (draftContent?.workflow?.state === 'IN_PROGRESS') {
                    status = 'Endret';
                } else {
                    // Avpublisert, skal ikke vises her
                    return undefined;
                }
            }

            const modifiedLocalTime = dayjsDateTime(draftContent.modifiedTime);
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
};
const getUsersLastContent = () => {
    // Hent aktuell bruker (redaktør)
    const user = authLib.getUser()?.key;
    if (!user) {
        return null;
    }

    // Hent brukers publiseringer, forhåndspubliseringer og avpubliaseringer
    const { published, prePublished, unPublished } = getUsersPublications(user);

    // Hent innhold modifisert av bruker
    const modified = getUsersModifications(user);

    const view = resolve('./dashboard-content.html');

    return {
        body: thymeleafLib.render(view, { published, prePublished, modified, unPublished }),
        contentType: 'text/html',
    };
};

exports.get = getUsersLastContent;
