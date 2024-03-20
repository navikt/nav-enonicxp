import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import { UserKey } from '/lib/xp/auditlog';
import * as contentLib from '/lib/xp/content';
import { APP_DESCRIPTOR } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import { contentTypesRenderedByEditorFrontend } from '../../../lib/contenttype-lists';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import utc from '/assets/dayjs/1.11.9/plugin/utc.js';
import { getContentProjectIdFromRepoId, getRepoConnection } from '../../../lib/utils/repo-utils';
import { notNullOrUndefined } from '../../../lib/utils/mixed-bag-of-utils';
import { forceArray, removeDuplicates as _removeDuplicates } from '../../../lib/utils/array-utils';
import { getAuditLogEntries } from './utils/auditLogQuery';
import {
    AuditLogArchived,
    AuditLogEntry,
    AuditLogPublished,
    AuditLogUnpublished,
    DashboardContentInfo,
} from './utils/types';

dayjs.extend(utc);

const getFromDate = () => dayjs().subtract(6, 'months').toISOString(); // Går bare 6 måneder tilbake i tid

const contentTypesToShow = [
    ...contentTypesRenderedByEditorFrontend,
    `${APP_DESCRIPTOR}:content-list`,
] as const;

const contentInfo = contentTypesToShow.map((contentType) => {
    const typeInfo = contentLib.getType(contentType);
    return {
        type: contentType,
        name: typeInfo ? typeInfo.displayName : '',
    };
});

const getRepoId = (entry: AuditLogEntry) => {
    const object = forceArray(entry.objects)[0];
    if (!object) {
        return undefined;
    }
    return object.split(':')[0];
};

const layerStr = (repo: string) => (repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '');

// Lag dayjs-dato - Kan være på Elastic-format (yyyy-mm-ddThh:mm:ss.mmmmmmZ)
const dayjsDateTime = (datetime: string) => {
    const localDate =
        datetime && datetime.search('Z') !== -1
            ? datetime.substring(0, 19).replace('T', ' ') // Er på Elastic-format
            : datetime;
    if (!localDate) {
        return undefined;
    }
    return dayjs(localDate).utc(true).local();
};

const getContentId = (entry: AuditLogEntry): string =>
    entry.type === 'system.content.archive'
        ? entry.data.params.contentId
        : forceArray(entry.data.params.contentIds)[0];

const getContentPublishInfo = (entry: AuditLogEntry) =>
    entry.type === 'system.content.publish' ? entry.data.params.contentPublishInfo : undefined;

const getContentFromLogEntries = (
    logEntries: AuditLogEntry[],
    publish: boolean,
    desc: boolean // Sorter synkende (publish/unpublish) eller stigende (prepublish)
): DashboardContentInfo[] | undefined => {
    // Fjern duplikater og bygg datamodell for visning
    const entries = removeDuplicates(logEntries).map((entry) => {
        const repoId = getRepoId(entry);
        if (!repoId) {
            return undefined;
        }
        const contentId = getContentId(entry);
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
                                values: contentTypesToShow,
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

        const projectId = getContentProjectIdFromRepoId(repoId);
        const layer = layerStr(projectId);
        let status = '',
            modifyDate,
            contentUrl;
        if (content?.archivedTime) {
            status = 'Arkivert';
            modifyDate = dayjsDateTime(content.archivedTime);
            contentUrl = 'widget/plus/archive'; // Viser til arkivet (kan ikke gå direkte til aktuelt innhold)
        } else {
            const contentPublishInfo = getContentPublishInfo(entry);
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
            url: `/admin/tool/com.enonic.app.contentstudio/main/${projectId}/${contentUrl}`,
        };
    });

    // Fjern tomme elementer (slette/ikke våre innholdstyper), sorter på korrekt dato og kutt av til 5
    const returnEntries = entries
        .filter(notNullOrUndefined)
        .sort((a, b) =>
            dayjs(a.modifyDate).isAfter(dayjs(b.modifyDate)) ? (desc ? -1 : 1) : desc ? 1 : -1
        )
        .slice(0, 5);
    return returnEntries.length > 0 ? returnEntries : undefined;
};

const removeDuplicates = <Type extends AuditLogEntry>(entries: Type[]) =>
    _removeDuplicates(
        entries,
        (a, b) => getContentId(a) === getContentId(b) && getRepoId(a) === getRepoId(b)
    );

const newerEntryFound = (entry: AuditLogEntry, list: AuditLogEntry[]) => {
    const contentId = getContentId(entry);
    const repoId = getRepoId(entry);
    return list.find((listEntry) => {
        const listEntryContentId = getContentId(listEntry);
        if (contentId === listEntryContentId && repoId === getRepoId(listEntry)) {
            return dayjs(listEntry.time).isAfter(entry.time);
        }
    });
};

// Sjekker om entry peker til innholdelement som også ligger til forhåndspublisering
// Hvis entry bare er en oppdatering av en kommende publisering, skal den ses bort i fra (true)
const prePublishedEntryFound = (
    entry: AuditLogPublished,
    published: AuditLogPublished[],
    unPublished: AuditLogUnpublished[]
) => {
    const entryContentPublishInfo = getContentPublishInfo(entry);
    if (entryContentPublishInfo?.from) {
        // Skal ikke teste på forhåndsubliseringer
        return false;
    }
    const entryContentId = getContentId(entry);
    const entryRepoId = getRepoId(entry);

    return published.find((publishedEntry) => {
        const publishedEntryContentId = getContentId(publishedEntry);
        if (
            entryContentId === publishedEntryContentId &&
            entryRepoId === getRepoId(publishedEntry)
        ) {
            if (entry._id === publishedEntry._id) {
                // Skal ikke teste på seg selv
                return false;
            }
            // Sjekk om publish from er fram i tid ELLER er nyere enn publiseringen som oppdaterte innholdet - 1c.
            // ELLER publish to har passert OG publiseringen ikke er nyere enn dette - 1d.
            const contentPublishInfo = getContentPublishInfo(publishedEntry);
            if (
                contentPublishInfo?.from &&
                (dayjs(contentPublishInfo.from).isAfter(dayjs()) ||
                    dayjs(contentPublishInfo.from).isAfter(entry.time) ||
                    (contentPublishInfo?.to &&
                        dayjs().isAfter(contentPublishInfo.to) &&
                        dayjs(contentPublishInfo.to).isAfter(entry.time)))
            ) {
                // Publiseringen skal ses bort i fra, med mindre forhåndspubliseringen er avbrutt (avpublisert)
                return !newerEntryFound(publishedEntry, unPublished);
            }
        }
        return false;
    });
};

// Hent alle brukers siste publiseringer, inkludert forhåndspubliseringer og avpubliseringer
const getUsersPublications = (user: UserKey) => {
    let publishedLogEntries = getAuditLogEntries({
        type: 'system.content.publish',
        user,
        query: '',
        count: 100,
    }) as AuditLogPublished[];

    let unpublishedLogEntries = getAuditLogEntries({
        type: 'system.content.unpublishContent',
        user,
        query: '',
        count: 100,
    }) as AuditLogUnpublished[];

    const archivedLogEntries = getAuditLogEntries({
        type: 'system.content.archive',
        user,
        query: '',
        count: 100,
    }) as AuditLogArchived[];

    // Gjennomgå arkivert-listen for eventuelt å legge til i avpublisert
    archivedLogEntries.forEach((entry) => {
        if (entry.data.result?.unpublishedContents) {
            // Innholdet er arkivert uten å være avpublisert først, legg til i avpublisert før behandling
            unpublishedLogEntries.push(entry as unknown as AuditLogUnpublished);
        }
    });

    // Listen for forhåndspublisering bygges opp under gjennomgang av publiserte
    const prePublishedEntries: AuditLogEntry[] = [];

    // Gjennomgå publiseringerer - kan være en av følgende:
    // 0.  Publisering som er arkivert senere
    // 1a. Publisering som er aktiv
    // 1b. Publisering som ikke aktiv lenger (avpublisert)
    // 1c. Publisering som oppdaterte en kommende forhåndspublisering og derfor skal ses bort ifra - (from) ikke nådd
    // 1d. Publisering som oppdaterte en forhåndspublisering som ikke er aktiv lenger - (to) har passert
    // 2a. Forhåndspublisering som er aktiv (publisert nå)
    // 2b. Forhåndspublisering som ikke er aktiv ennå - (from) er ikke nådd OG ikke avpublisert etterpå
    // 2c. Forhåndspublisering som er avpublisert etterpå
    // 2d. Forhåndspublisering som ikke er aktiv lenger - (to) har passert
    publishedLogEntries = publishedLogEntries.filter((entry) => {
        // Må sjekke om denne er arkivert senere
        if (newerEntryFound(entry, archivedLogEntries)) {
            // 0. Er arkivert, skal ikke vises under publisert
            return false;
        }
        // Må sjekke om det finnes en forhåndspublisering som overstyrer denne
        const prepublished = prePublishedEntryFound(
            entry,
            publishedLogEntries,
            unpublishedLogEntries
        );
        if (prepublished) {
            // 1c. ELLER 1d. - fjern denne (forhåndspubliseringen behandles senere)
            return false;
        }
        const contentPublishInfo = entry.data.params?.contentPublishInfo;
        const publishFromDate = contentPublishInfo?.from && dayjsDateTime(contentPublishInfo.from);
        const publishToDate = contentPublishInfo?.to && dayjsDateTime(contentPublishInfo.to);
        if (publishFromDate) {
            // 2. Dette er en forhåndspublisering (from)
            // Må sjekke om det er avpublisert etterpå
            const unpublishedLater = newerEntryFound(entry, unpublishedLogEntries);
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
                        unpublishedLogEntries.push(entry as unknown as AuditLogUnpublished);
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
        const unpublishedLater = newerEntryFound(entry, unpublishedLogEntries);
        return !unpublishedLater; // True: 1a. - False: 1b.
    });

    // Gjennomgå avpubliseringer
    // 1. Avpublisert innhold som er arkivert etterpå må få oppdatert tidspunkt til arkiverinstidspunktet
    // 2. Entries skal fjernes hvis det finnes en nyere publisering eller forhåndspubliering
    unpublishedLogEntries.map((entry) => {
        const archivedLater = newerEntryFound(entry, archivedLogEntries);
        if (archivedLater) {
            // 0. Arkivert etterpå, tidspunkt som skal brukes til sortering er arkiveringstidpunktet
            entry.time = archivedLater.time;
        }
    });
    // Sorter avpublisert på nytt, fjern eventulle duplikater som har oppstått
    unpublishedLogEntries.sort((a, b) => {
        const aContentPublishInfo = getContentPublishInfo(a);
        const bContentPublishInfo = getContentPublishInfo(b);
        const aDate = aContentPublishInfo?.to || a.time;
        const bDate = bContentPublishInfo?.to || b.time;
        return dayjs(aDate).isAfter(dayjs(bDate)) ? -1 : 1;
    });
    unpublishedLogEntries = removeDuplicates(unpublishedLogEntries);
    // 2. Fjern fra avpublisert hvis publisering eller forhåndspublisering av nyere dato
    unpublishedLogEntries = unpublishedLogEntries.filter((entry) => {
        const contentId = getContentId(entry);
        const repoId = getRepoId(entry);
        const publishedLater = newerEntryFound(entry, publishedLogEntries);
        const prePublishedLater = prePublishedEntries.find((duplicate) => {
            const dupCheckContentId = getContentId(duplicate);
            if (contentId === dupCheckContentId && repoId === getRepoId(duplicate)) {
                const contentPublishInfo = getContentPublishInfo(entry);
                const publishFromDate =
                    contentPublishInfo?.from && dayjsDateTime(contentPublishInfo.from);
                return dayjs(publishFromDate).isAfter(entry.time);
            }
        });
        return !publishedLater && !prePublishedLater;
    });

    // Returner content for alle tre typer
    const published = getContentFromLogEntries(publishedLogEntries, true, true);
    const prePublished = getContentFromLogEntries(prePublishedEntries, true, false);
    const unPublished = getContentFromLogEntries(unpublishedLogEntries, false, true);
    return {
        published,
        prePublished,
        unPublished,
    };
};

// Hent brukers endringer av innhold siste 6 måneder (bare lokalisert innhold av "våre" innholdsyper)
const getUsersModifications = (user: UserKey) => {
    const repos = getLayersMultiConnection('draft');
    return repos
        .query({
            count: 5000,
            query: `modifier = '${user}' AND range('modifiedTime', instant('${getFromDate()}'), '')`,
            filters: {
                boolean: {
                    mustNot: NON_LOCALIZED_QUERY_FILTER,
                    must: {
                        hasValue: {
                            field: 'type',
                            values: contentTypesToShow,
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
            const projectId = getContentProjectIdFromRepoId(hit.repoId);
            const layer = layerStr(projectId);
            const contentTypeInfo = contentInfo.find((el) => el.type === draftContent.type);

            return {
                displayName: draftContent.displayName + layer,
                contentType: contentTypeInfo ? contentTypeInfo.name : '',
                modifiedTime: modifiedLocalTime,
                modifiedTimeStr: dayjs(modifiedLocalTime).format('DD.MM.YYYY - HH:mm:ss'),
                status,
                title: draftContent._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/${projectId}/edit/${draftContent._id}`,
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

export const get = getUsersLastContent;
