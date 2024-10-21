import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { QueryDsl } from '/lib/xp/node';
import { createOrUpdateSchedule } from './schedule-job';
import { APP_DESCRIPTOR, MISC_REPO_ID, URLS } from '../constants';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../utils/logging';
import { MainArticle } from '@xp-types/site/content-types';
import { runInContext } from '../context/run-in-context';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getMiscRepoConnection } from '../repos/misc-repo';
import { getRepoConnection } from '../repos/repo-utils';

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

const LOG_DIR = 'old-news-archived';
const LOG_DIR_PATH = `/${LOG_DIR}`;

const pressReleasesQuery: QueryDsl = {
    boolean: {
        must: [
            {
                term: {
                    field: 'type',
                    value: 'no.nav.navno:main-article' satisfies ContentDescriptor,
                },
            },
            {
                term: {
                    field: 'data.contentType',
                    value: 'pressRelease' satisfies MainArticle['contentType'],
                },
            },
        ],
    },
};

const newsQuery: QueryDsl = {
    boolean: {
        should: [
            {
                boolean: {
                    must: [
                        {
                            term: {
                                field: 'type',
                                value: 'no.nav.navno:main-article' satisfies ContentDescriptor,
                            },
                        },
                        {
                            term: {
                                field: 'data.contentType',
                                value: 'news' satisfies MainArticle['contentType'],
                            },
                        },
                    ],
                },
            },
            {
                term: {
                    field: 'type',
                    value: 'no.nav.navno:current-topic-page' satisfies ContentDescriptor,
                },
            },
        ],
    },
};

type ContentDataSimple = Pick<
    Content,
    '_id' | '_path' | 'createdTime' | 'modifiedTime' | 'type'
> & {
    subType?: MainArticle['contentType'];
    repoId: string;
    error?: string;
    childrenIds?: string[];
};

type ArchiveResult = {
    totalFound: number;
    failed: ContentDataSimple[];
    archived: ContentDataSimple[];
};

const simplifyContent = (content: Content, repoId: string): ContentDataSimple => {
    const { _id, _path, createdTime, modifiedTime, type, data } = content;

    return {
        _id,
        _path,
        repoId,
        createdTime,
        modifiedTime,
        type,
        subType: data.contentType,
    };
};

const persistResult = (result: ArchiveResult, startTs: number, resultType: string) => {
    const repoConnection = getMiscRepoConnection();

    if (!repoConnection.exists(LOG_DIR_PATH)) {
        repoConnection.create({ _parentPath: '/', _name: LOG_DIR });
    }

    const now = new Date().toISOString();

    const logEntryName = `archived-${resultType}-${now}`;
    const logEntryDataToolboxUrl = [
        URLS.PORTAL_ADMIN_ORIGIN,
        '/admin/tool/systems.rcd.enonic.datatoolbox/data-toolbox#node?repo=',
        MISC_REPO_ID,
        '&branch=master&path=',
        encodeURIComponent(`${LOG_DIR_PATH}/${logEntryName}`),
    ].join('');

    repoConnection.create({
        _parentPath: LOG_DIR_PATH,
        _name: logEntryName,
        summary: {
            started: new Date(startTs).toISOString(),
            finished: now,
            type: resultType,
            totalFound: result.totalFound,
            totalFailed: result.failed.length,
            totalArchived: result.archived.length,
        },
        failed: result.failed,
        archived: result.archived,
    });

    logger.info(
        `Archiving result for ${logEntryName}: Total contents found ${result.totalFound} | Success count ${result.archived.length} | Failed count ${result.failed.length} - Full results: ${logEntryDataToolboxUrl}`
    );
};

// Unpublishing a content will also unpublish all its descendants. If there are any descendants
// which are newer than the cut-off timestamp that was set, we don't want to run the unpublish.
const hasNewerDescendants = (content: ContentDataSimple | Content, timestamp: string): boolean => {
    const children = contentLib.getChildren({ key: content._id, count: 1000 });

    return children.hits.some(
        (child) =>
            (child.modifiedTime || child.createdTime) > timestamp ||
            hasNewerDescendants(child, timestamp)
    );
};

const unpublishAndArchiveContents = (
    contents: ContentDataSimple[],
    cutoffTs: string
): ArchiveResult => {
    const contentToUnpublish: ContentDataSimple[] = [];
    const archivedContent: ArchiveResult['archived'] = [];
    const failedContent: ArchiveResult['failed'] = [];

    contents.forEach((content) => {
        if (hasNewerDescendants(content, cutoffTs)) {
            logger.error(
                `Content ${content._id} / ${content._path} has newer descendants, skipping unpublish`
            );
            failedContent.push({
                ...content,
                error: 'Content has children newer than the specified cutoff timestamp',
            });
        } else {
            contentToUnpublish.push(content);
        }
    });

    runInContext({ branch: 'draft', asAdmin: true }, () =>
        contentToUnpublish.forEach((content) => {
            try {
                const unpublishResult = contentLib.unpublish({
                    keys: [content._id],
                });

                contentLib.archive({ content: content._id });

                archivedContent.push({
                    ...content,
                    childrenIds: unpublishResult.filter((id) => id !== content._id),
                });
            } catch (e: any) {
                logger.error(
                    `Failed to unpublish/archive ${content._id} / ${content._path} - ${e}`
                );
                failedContent.push({ ...content, error: e.toString() });
            }
        })
    );

    return {
        totalFound: contents.length,
        failed: failedContent,
        archived: archivedContent,
    };
};

const findAndArchiveOldContent = (query: QueryDsl, cutoffTs: string): ArchiveResult => {
    const hitsPerRepo = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: false,
        queryParams: {
            count: 5000,
            sort: 'modifiedTime DESC',
            query: {
                boolean: {
                    must: [
                        {
                            range: {
                                field: 'modifiedTime',
                                lt: cutoffTs,
                            },
                        },
                        query,
                    ],
                },
            },
        },
    });

    const result: ArchiveResult = {
        totalFound: 0,
        archived: [],
        failed: [],
    };

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        const layerRepo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });

        logger.info(`Found ${hits.length} contents for archiving in repo ${repoId}`);

        const contents = hits.reduce<ContentDataSimple[]>((acc, contentId) => {
            const contentNode = layerRepo.get<Content>(contentId);
            if (contentNode) {
                acc.push(simplifyContent(contentNode, repoId));
            }

            return acc;
        }, []);

        const layerResult = runInContext({ repository: repoId, asAdmin: true }, () =>
            unpublishAndArchiveContents(contents, cutoffTs)
        );

        result.totalFound += hits.length;
        result.failed.push(...layerResult.failed);
        result.archived.push(...layerResult.archived);
    });

    return result;
};

export const archiveOldNews = () =>
    runInContext({ asAdmin: true }, () => {
        const started = Date.now();

        const pressReleasesResult = findAndArchiveOldContent(
            pressReleasesQuery,
            new Date(started - ONE_YEAR_MS).toISOString()
        );

        persistResult(pressReleasesResult, started, 'pressReleases');

        const newsResult = findAndArchiveOldContent(
            newsQuery,
            new Date(started - TWO_YEARS_MS).toISOString()
        );

        persistResult(newsResult, started, 'news');
    });

// TODO: activate this after running an initial (large) job on existing content
export const activateArchiveNewsSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'archive-old-news',
        jobSchedule: {
            type: 'CRON',
            value: '7 * * * 1',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${APP_DESCRIPTOR}:archive-old-news`,
        taskConfig: {},
    });
};
