import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { QueryDsl } from '/lib/xp/node';
import { createOrUpdateSchedule } from './schedule-job';
import { APP_DESCRIPTOR, SEARCH_REPO_ID, URLS } from '../constants';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../utils/logging';
import { MainArticle } from '@xp-types/site/content-types';
import { getRepoConnection } from '../utils/repo-utils';
import { runInContext } from '../context/run-in-context';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

const LOG_DIR = 'old-news-archived';
const LOG_DIR_PATH = `/${LOG_DIR}`;

const pressReleasesQuery = (): QueryDsl => ({
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
});

const newsQuery = (): QueryDsl => ({
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
});

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
    skipped: ContentDataSimple[];
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
    const repoConnection = getRepoConnection({
        repoId: SEARCH_REPO_ID, // Use the old search repo because cba to create a new repo just for this :D
        asAdmin: true,
        branch: 'master',
    });

    if (!repoConnection.exists(LOG_DIR_PATH)) {
        repoConnection.create({ _parentPath: '/', _name: LOG_DIR });
    }

    const now = new Date().toISOString();

    const logEntryName = `archived-${resultType}-${now}`;
    const logEntryDataToolboxUrl = [
        URLS.PORTAL_ADMIN_ORIGIN,
        '/admin/tool/systems.rcd.enonic.datatoolbox/data-toolbox#node?repo=',
        SEARCH_REPO_ID,
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
            totalSkipped: result.skipped.length,
            totalFailed: result.failed.length,
            totalUnpublished: result.archived.length,
        },
        skipped: result.skipped,
        failed: result.failed,
        archived: result.archived,
    });

    logger.info(
        `Archiving result for ${logEntryName}: Found ${result.totalFound} | Archived ${result.archived.length} | Skipped ${result.skipped.length} | Failed ${result.failed.length} - Full results: ${logEntryDataToolboxUrl}`
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
    timestamp: string
): ArchiveResult => {
    const contentToUnpublish: ContentDataSimple[] = [];
    const skippedContent: ArchiveResult['skipped'] = [];

    contents.forEach((content) => {
        if (hasNewerDescendants(content, timestamp)) {
            logger.error(
                `Content ${content._id} / ${content._path} has newer descendants, skipping unpublish`
            );
            skippedContent.push(content);
        } else {
            contentToUnpublish.push(content);
        }
    });

    const archivedContent: ArchiveResult['archived'] = [];
    const failedContent: ArchiveResult['failed'] = [];

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
        skipped: skippedContent,
        failed: failedContent,
        archived: archivedContent,
    };
};

const findAndArchiveOldContent = (query: QueryDsl, maxAge: string): ArchiveResult => {
    const foundContents = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: true,
        queryParams: {
            count: 5000,
            sort: 'modifiedTime DESC',
            query: {
                boolean: {
                    must: [
                        {
                            range: {
                                field: 'modifiedTime',
                                lt: maxAge,
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
        skipped: [],
        archived: [],
        failed: [],
    };

    Object.entries(foundContents).forEach(([repoId, contents]) => {
        logger.info(`Found ${contents.length} content for archiving in repo ${repoId}`);

        const contentsSimple = contents.map((content) => simplifyContent(content, repoId));

        const layerResult = runInContext({ repository: repoId, asAdmin: true }, () =>
            unpublishAndArchiveContents(contentsSimple, maxAge)
        );

        result.totalFound += contents.length;
        result.skipped.push(...layerResult.skipped);
        result.failed.push(...layerResult.failed);
        result.archived.push(...layerResult.archived);
    });

    return result;
};

export const archiveOldNews = () =>
    runInContext({ asAdmin: true }, () => {
        const started = Date.now();

        const pressReleasesResult = findAndArchiveOldContent(
            pressReleasesQuery(),
            new Date(started - ONE_YEAR_MS).toISOString()
        );

        persistResult(pressReleasesResult, started, 'pressReleases');

        const newsResult = findAndArchiveOldContent(
            newsQuery(),
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
