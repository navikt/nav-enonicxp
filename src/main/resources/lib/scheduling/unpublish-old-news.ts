import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { QueryDsl } from '/lib/xp/node';
import { createOrUpdateSchedule } from './schedule-job';
import { APP_DESCRIPTOR, SEARCH_REPO_ID } from '../constants';
import { batchedContentQuery } from '../utils/batched-query';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../utils/logging';
import { MainArticle } from '@xp-types/site/content-types';
import { getRepoConnection } from '../utils/repo-utils';
import { runInContext } from '../context/run-in-context';

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

const LOG_DIR = 'old-news-unpublished';
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

const transformToLogEntry = (content: Content) => {
    const { _id, _path, createdTime, modifiedTime, type, data } = content;

    return {
        _id,
        _path,
        createdTime,
        modifiedTime,
        type,
        subType: data.contentType,
    };
};

const persistResult = (result: UnpublishResult, startTs: number, resultType: string) => {
    const unpublished = result.unpublished.map(transformToLogEntry);
    const skipped = result.skipped.map(transformToLogEntry);
    const failed = result.failed.map(transformToLogEntry);

    const repoConnection = getRepoConnection({
        repoId: SEARCH_REPO_ID, // Use the old search repo because cba to create a new repo just for this :D
        asAdmin: true,
        branch: 'master',
    });

    if (!repoConnection.exists(LOG_DIR_PATH)) {
        repoConnection.create({ _parentPath: '/', _name: LOG_DIR });
    }

    const now = new Date().toISOString();

    repoConnection.create({
        _parentPath: LOG_DIR_PATH,
        _name: `unpublished-${resultType}-${now}`,
        summary: {
            started: new Date(startTs).toISOString(),
            finished: now,
            type: resultType,
            totalFound: result.totalFound,
            totalSkipped: result.skipped.length,
            totalFailed: result.failed.length,
            totalUnpublished: result.unpublished.length,
        },
        skipped,
        failed,
        unpublished,
    });
};

const hasNewerDescendants = (content: Content, timestamp: string): boolean => {
    if (!content.hasChildren) {
        return false;
    }

    const children = contentLib.getChildren({ key: content._id, count: 1000 });

    return children.hits.some(
        (child) =>
            (child.modifiedTime || child.createdTime) > timestamp ||
            hasNewerDescendants(child, timestamp)
    );
};

type UnpublishResult = {
    totalFound: number;
    skipped: Content[];
    failed: Content[];
    unpublished: Content[];
};

const findAndUnpublishOldContent = (query: QueryDsl, timestamp: string): UnpublishResult => {
    const matchingContent = batchedContentQuery({
        count: 10,
        sort: 'modifiedTime DESC',
        query: {
            boolean: {
                must: [
                    {
                        range: {
                            field: 'modifiedTime',
                            lt: timestamp,
                        },
                    },
                    query,
                ],
            },
        },
    });

    logger.info(`Found ${matchingContent.total} matching content`);

    const contentToUnpublish: Content[] = [];
    const skippedContent: Content[] = [];

    matchingContent.hits.forEach((content) => {
        if (hasNewerDescendants(content, timestamp)) {
            logger.error(
                `Content ${content._id} / ${content._path} has newer descendants, skipping unpublish`
            );
            skippedContent.push(content);
        } else {
            contentToUnpublish.push(content);
        }
    });

    const unpublishedContent: Content[] = [];
    const failedContent: Content[] = [];

    runInContext({ branch: 'draft', asAdmin: true }, () =>
        contentToUnpublish.forEach((content) => {
            try {
                const unpublishResult = contentLib.unpublish({
                    keys: [content._id],
                });

                logger.info(
                    `Unpublished result for ${content._id} / ${content._path} - ${unpublishResult}`
                );
                unpublishedContent.push(content);
            } catch (e) {
                logger.error(`Failed to unpublish ${content._id} / ${content._path} - ${e}`);
                failedContent.push(content);
            }
        })
    );

    return {
        totalFound: matchingContent.total,
        skipped: skippedContent,
        failed: failedContent,
        unpublished: unpublishedContent,
    };
};

export const unpublishOldNews = () =>
    runInContext({ asAdmin: true }, () => {
        const started = Date.now();

        const pressReleasesResult = findAndUnpublishOldContent(
            pressReleasesQuery(),
            new Date(started - ONE_YEAR_MS).toISOString()
        );

        persistResult(pressReleasesResult, started, 'pressReleases');

        const newsResult = findAndUnpublishOldContent(
            newsQuery(),
            new Date(started - TWO_YEARS_MS).toISOString()
        );

        persistResult(newsResult, started, 'news');
    });

export const activateUnpublishOldNewsSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'unpublish-old-news',
        jobSchedule: {
            type: 'CRON',
            value: '7 * * * 1',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${APP_DESCRIPTOR}:unpublish-old-news`,
        taskConfig: {},
    });
};
