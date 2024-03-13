import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import * as auditLogLib from '/lib/xp/auditlog';
import * as contentLib from '/lib/xp/content';
import { Source } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, APP_DESCRIPTOR, SUPER_USER } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import { contentTypesRenderedByEditorFrontend } from '../../../lib/contenttype-lists';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import utc from '/assets/dayjs/1.11.9/plugin/utc.js';

dayjs.extend(utc);
const fromDate = dayjs().subtract(6, 'months').toISOString(); // Går bare 6 måneder tilbake i tid

const contentTypes2Show = [
    ...contentTypesRenderedByEditorFrontend,
    `${APP_DESCRIPTOR}:content-list`,
];
const contentInfo = contentTypes2Show.map((contentType) => {
    const typeInfo = contentLib.getType(contentType);
    return {
        type: contentType,
        name: typeInfo ? typeInfo.displayName : '',
    };
});

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
    contentType: string;
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

// Lag dayjs-dato - Kan være på Elastic-format (yyyy-mm-ddThh:mm:ss.mmmmmmZ)
const dayjsDateTime = (datetime: string) => {
    const localDate = datetime && datetime.search('Z') !== -1
        ? datetime.substring(0, 19).replace('T', ' ')   // Er på Elastic-format
        : datetime;
    if (!localDate) {
        return undefined;
    }
    return dayjs(localDate).utc(true).local();
}

const sortEntries = (entries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]) => {
    // Endre datoformat fra "Elastic spesial" og sorter
    if (!entries) {
        return [];
    }
    entries.map((entry) => {
        const dayjsDT = dayjsDateTime(entry.time);
        if (dayjsDT) {
            entry.time = dayjsDT.toString();
        }
    });
    return entries.sort((a, b) => (dayjs(a.time).isAfter(dayjs(b.time)) ? -1 : 1));
};

const getContentFromLogEntries = (
    logEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[],
    publish: boolean,
    desc: boolean           // Sorter synkende (publish/unpublish) eller stigende (prepublish)
): ContentInfo[] | undefined => {
    // Fjern duplikater og bygg datamodell for visning
    const entries = check4Duplicates(logEntries).map((entry) => {
        const repoId = getRepoId(entry);
        if (!repoId) {
            return undefined;
        }
        const contentId =
            (entry.data.params?.contentIds as string) || (entry.data.params?.contentId as string);
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
                                values: contentTypes2Show,
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
        let status = '',
            modifyDate,
            contentUrl;
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
        const contentTypeInfo = contentInfo.find((el) => el.type === content.type);
        return {
            displayName: content.displayName + layer,
            contentType: contentTypeInfo ? contentTypeInfo.name : '',
            modifyDate,
            modifiedTimeStr: dayjs(modifyDate).format('DD.MM.YYYY - HH:mm:ss'),
            status,
            title: content._path.replace('/content/www.nav.no/', ''),
            url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/${contentUrl}`,
        };
    });

    // Fjern tomme elementer (slette/ikke våre innholdstyper), sorter på korrekt dato og kutt av til 5
    const returnEntries = entries
        .filter(removeUndefined)
        .sort((a, b) => (dayjs(a.modifyDate).isAfter(dayjs(b.modifyDate)) ? (desc ? -1 : 1) : (desc ? 1 : -1)))
        .slice(0, 5);
    return returnEntries.length > 0 ? returnEntries : undefined;
};

const check4Duplicates = (entries: auditLogLib.LogEntry<auditLogLib.DefaultData>[]) => {
    const duplicates = [] as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    return entries.filter((entry) => {
        const contentId =
            (entry.data.params.contentIds as string) || (entry.data.params.contentId as string);
        const repoId = getRepoId(entry);
        const duplicate = duplicates.find((duplicate) => {
            const dupCheckContentId =
                (duplicate.data.params.contentIds as string) ||
                (duplicate.data.params.contentId as string);
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
        (entry.data.params.contentIds as string) || (entry.data.params.contentId as string);
    const repoId = getRepoId(entry);
    return list.find((listEntry) => {
        const listEntryContentId =
            (listEntry.data.params.contentIds as string) ||
            (listEntry.data.params.contentId as string);
        if (contentId === listEntryContentId && repoId === getRepoId(listEntry)) {
            return dayjs(listEntry.time).isAfter(entry.time);
        }
    });
};

// Sjekker om entry peker til innholdelement som også ligger til forhåndspublisering
// Hvis entry bare er en oppdatering av en kommende publisering, skal den ses bort i fra (true)
const prePublishedEntryFound = (
    entry: auditLogLib.LogEntry<auditLogLib.DefaultData>,
    published: auditLogLib.LogEntry<auditLogLib.DefaultData>[],
    unPublished: auditLogLib.LogEntry<auditLogLib.DefaultData>[],
) => {
    const entryContentPublishInfo = entry.data.params.contentPublishInfo as any;
    if ( entryContentPublishInfo?.from ) {
        // Skal ikke teste på forhåndsubliseringer
        return false;
    }
    const entryContentId = entry.data.params.contentIds as string;
    const entryRepoId = getRepoId(entry);

    return published.find((publishedEntry) => {
        const publishedEntryContentId = publishedEntry.data.params.contentIds as string;
        if (entryContentId === publishedEntryContentId && entryRepoId === getRepoId(publishedEntry)) {
            if (entry._id === publishedEntry._id) {
                // Skal ikke teste på seg selv
                return false;
            }
            // Sjekk om publish from er fram i tid ELLER er nyere enn publiseringen som oppdaterte innholdet
            const contentPublishInfo = publishedEntry.data.params.contentPublishInfo as any;
            if (contentPublishInfo?.from &&
                (dayjs(contentPublishInfo.from).isAfter(dayjs()) || dayjs(contentPublishInfo.from).isAfter(entry.time))
            ) {
                // Publiseringen skal ses bort i fra, med mindre forhåndspubliseringen er avbrutt (avpublisert)
                return newerEntryFound(publishedEntry, unPublished)
            }
        }
        return false;
    });
};

// Hent alle brukers siste publiseringer, inkludert forhåndspubliseringer og avpubliseringer
const getUsersPublications = (user: `user:${string}:${string}`) => {
    const logEntries = auditLogLib.find({
        count: 5000,
        from: fromDate,
        users: [user],
    }) as any;
    const publishedLogEntries = logEntries.hits.filter(
        (entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) =>
            entry.type === 'system.content.publish'
    );
    const unpublishedLogEntries = logEntries.hits.filter(
        (entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) =>
            entry.type === 'system.content.unpublishContent'
    );
    const archivedLogEntries = logEntries.hits.filter(
        (entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) =>
            entry.type === 'system.content.archive'
    );

    // Gjennomgå arkivert-listen for eventuelt å legge til i avpublisert
    archivedLogEntries.forEach((entry: auditLogLib.LogEntry<auditLogLib.DefaultData>) => {
        if (entry.data.result?.unpublishedContents) {
            // Innholdet er arkivert uten å være avpublisert først, legg til i avpublisert før behandling
            unpublishedLogEntries.push(entry);
        }
    });

    // Sorter treff
    const archivedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = sortEntries(archivedLogEntries);
    let publishedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = sortEntries(publishedLogEntries);
    let unpublishedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = sortEntries(unpublishedLogEntries);

    // Listen for forhåndspublisering bygges opp under gjennomgang av publiserte
    const prePublishedEntries: auditLogLib.LogEntry<auditLogLib.DefaultData>[] = [];

    // Gjennomgå publiseringerer - kan være en av følgende:
    // 0.  Publisering som er arkivert senere
    // 1a. Vanlig publisering som er aktiv
    // 1b. Vanlig publisering som ikke aktiv lenger (avpublisert)
    // 1c. Vanlig publisering som bare oppdaterte en kommende forhåndspublisering og derfor skal ses bort ifra
    // 2a. Forhåndspublisering som er aktiv (publisert nå)
    // 2b. Forhåndspublisering som ikke er aktiv ennå - (from) er ikke nådd OG ikke avpublisert etterpå
    // 2c. Forhåndspublisering som er avpublisert etterpå
    // 2d. Forhåndspublisering som ikke er aktiv lenger - (to) har passert
    publishedEntries = publishedEntries.filter((entry) => {
        // Må sjekke om denne er arkivert senere
        if (newerEntryFound(entry, archivedEntries)) {
            // 0. Er arkivert, skal ikke vises under publisert
            return false;
        }
        // Må sjekke om det finnes en forhåndspublisering som overstyrer denne
        const prepublished = prePublishedEntryFound(entry, publishedEntries, unpublishedEntries);
        if (prepublished) {
            // 1c. Kun en oppdatering av en forhåndspublisering - fjern denne (forhåndspubliseringen behandles senere)
            return false;
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
                    // 2b. - skal vises i forhåndspublisert-listen og ikke i publisert
                    prePublishedEntries.push(entry);
                    return false;
                }
                if (publishToDate) {
                    // Dette er en forhåndspublisering med gyldighetstid (to)
                    const unpublishDateExceeded = dayjs().isAfter(publishToDate);
                    if (unpublishDateExceeded) {
                        // 2d. Har utløpt på tid - skal vises i avpublisert-listen og ikke i publisert
                        unpublishedEntries.push(entry);
                        return false;
                    }
                }
                // 2a. Er publisert - må justere dato til publiseringstidspunktet
                entry.time = publishFromDate.toString();
                return true;
            } else {
                // 2c. Er avpublisert- skal ikke vises i publisert
                return false;
            }
        }
        // Dette er en publisering - 1.
        // Fjern fra listen hvis den er avpublisert etterpå - 1b.
        const unpublishedLater = newerEntryFound(entry, unpublishedEntries);
        return !unpublishedLater; // True: 1a. - False: 1b.
    });

    // Gjennomgå avpubliseringer
    // 1. Avpublisert innhold som er arkivert etterpå må få oppdatert tidspunkt til arkiverinstidspunktet
    // 2. Entries skal fjernes hvis det finnes en nyere publisering eller forhåndspubliering
    unpublishedEntries.map((entry) => {
       const archivedLater = newerEntryFound(entry, archivedEntries);
       if (archivedLater) {
           // 0. Arkivert etterpå, tidspunkt som skal brukes til sortering er arkiveringstidpunktet
           entry.time = archivedLater.time;
       }
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
    // 2. Fjern fra avpublisert hvis publisering eller forhåndspublisering av nyere dato
    unpublishedEntries = unpublishedEntries.filter((entry) => {
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

    // Returner content for alle tre typer
    const published = getContentFromLogEntries(publishedEntries, true, true);
    const prePublished = getContentFromLogEntries(prePublishedEntries, true, false);
    const unPublished = getContentFromLogEntries(unpublishedEntries, false, true);
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
                            values: contentTypes2Show,
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
            const contentTypeInfo = contentInfo.find((el) => el.type === draftContent.type);

            return {
                displayName: draftContent.displayName + layer,
                contentType: contentTypeInfo ? contentTypeInfo.name : '',
                modifiedTime: modifiedLocalTime,
                modifiedTimeStr: dayjs(modifiedLocalTime).format('DD.MM.YYYY - HH:mm:ss'),
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
