import { NAVNO_NODE_ROOT_PATH } from '../constants';
import { getRepoConnection } from '../repos/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { getLastPublishedContentVersion } from './get-content';
import { isExcludedFromExternalArchive } from '../utils/content-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { stripPathPrefix } from '../paths/path-utils';

// Enumererer publisert innhold som skal ligge i det eksterne arkivet, for backfill.
// Todeling: enonic-xp eier "hva" (denne lista), xp-archive eier "hvordan" (render + lagring).
// Keyset-/cursor-paginering på _path (ikke offset): naisjobben sender siste _path den
// så (`after`) og får neste side. Det gir stabil rekkefølge (ingen skip/dupe mellom
// sider) og unngår Elasticsearch sitt max_result_window-tak (offset ville feilet forbi
// ~10k noder).

export type ArchiveNodeListEntry = {
    id: string;
    locale: string;
    path: string;
};

export type ArchiveNodeListResult = {
    nodes: ArchiveNodeListEntry[];
    count: number;
    // Cursor for neste kall: fullt _path til siste RÅ-treff (før filtrering). Send inn
    // som `after` i neste kall. Uendret fra input hvis ingen treff.
    nextAfter: string;
    // true hvis siden var full (result.hits.length === count) → kan finnes mer.
    hasMore: boolean;
};

// Speiler content-tree.ts sin live-logikk: hent siste publiserte versjon per node og
// filtrer bort isExcludedFromExternalArchive. I tillegg krever vi isContentLocalized,
// slik at en flat query mot locale-repoets master ikke drar med ikke-lokalisert arvet
// innhold (event-push sjekker det samme). Cursoren (nextAfter) flyttes over ALLE
// rå-treff, ikke bare de inkluderte, så filtrering ikke lager hull i pagineringen.
export const buildExternalArchiveNodeList = (
    locale: string,
    after: string,
    count: number
): ArchiveNodeListResult => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    if (!repoId) {
        return { nodes: [], count, nextAfter: after, hasMore: false };
    }

    const masterRepo = getRepoConnection({
        repoId,
        branch: 'master',
        asAdmin: true,
    });

    const result = masterRepo.query({
        count,
        query: {
            boolean: {
                must: [
                    { like: { field: '_path', value: `${NAVNO_NODE_ROOT_PATH}/*` } },
                    ...(after ? [{ range: { field: '_path', gt: after } }] : []),
                ],
            },
        },
        sort: '_path ASC',
    });

    let nextAfter = after;
    const nodes = result.hits.reduce<ArchiveNodeListEntry[]>((acc, { id }) => {
        const content = getLastPublishedContentVersion(id, locale);
        if (!content) {
            return acc;
        }
        // Flytt cursoren over hvert rå-treff (også ekskluderte), ellers stopper
        // pagineringen på første ekskluderte hale.
        nextAfter = content._path;
        if (isContentLocalized(content) && !isExcludedFromExternalArchive(content)) {
            acc.push({
                id: content._id,
                locale,
                path: stripPathPrefix(content._path),
            });
        }
        return acc;
    }, []);

    return {
        nodes,
        count,
        nextAfter,
        hasMore: result.hits.length === count,
    };
};
