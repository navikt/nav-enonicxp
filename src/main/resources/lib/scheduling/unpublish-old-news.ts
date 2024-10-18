import * as contentLib from '/lib/xp/content';
import { ContentsResult } from '/lib/xp/content';
import { QueryDsl } from '/lib/xp/node';
import { createOrUpdateSchedule } from './schedule-job';
import { APP_DESCRIPTOR, CONTENT_LOCALE_DEFAULT, SEARCH_REPO_ID } from '../constants';
import { batchedContentQuery } from '../utils/batched-query';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../utils/logging';
import { runInLocaleContext } from '../localization/locale-context';
import { MainArticle } from '@xp-types/site/content-types';
import { getRepoConnection } from '../utils/repo-utils';

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

const LOG_DIR = 'old-news-unpublished';

const pressemeldingerRule = (): QueryDsl => ({
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
            {
                range: {
                    field: 'modifiedTime',
                    lt: new Date(Date.now() - TWO_YEARS_MS).toISOString(),
                },
            },
        ],
    },
});

const nyheterRule = (): QueryDsl => ({
    boolean: {
        must: [
            {
                range: {
                    field: 'modifiedTime',
                    lt: new Date(Date.now() - ONE_YEAR_MS).toISOString(),
                },
            },
            {
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
            },
        ],
    },
});

const persistLogs = (result: ContentsResult) => {
    const transformedHits = result.hits.map((content) => {
        const { _id, _path, createdTime, modifiedTime, type, data } = content;

        return {
            _id,
            _path,
            createdTime,
            modifiedTime,
            type,
            subType: data.contentType,
        };
    });

    const repoConnection = getRepoConnection({
        repoId: SEARCH_REPO_ID, // Use the old search repo because cba to create a new repo just for this :D
        asAdmin: true,
        branch: 'master',
    });

    const parentDir = `/${LOG_DIR}`;

    if (!repoConnection.exists(parentDir)) {
        repoConnection.create({ _parentPath: '/', _name: LOG_DIR });
    }

    const now = new Date().toISOString();

    repoConnection.create({
        _parentPath: parentDir,
        _name: `unpublished-${now}`,
        summary: {
            ts: now,
            total: result.total,
        },
        unpublished: transformedHits,
    });
};

export const unpublishOldNews = () =>
    runInLocaleContext({ locale: CONTENT_LOCALE_DEFAULT, asAdmin: true, branch: 'master' }, () => {
        const matchingContent = batchedContentQuery({
            count: 5000,
            sort: 'modifiedTime DESC',
            query: {
                boolean: {
                    should: [pressemeldingerRule(), nyheterRule()],
                },
            },
        });

        logger.info(`Found ${matchingContent.total} content total`);

        const idsToUnpublish = matchingContent.hits.map((hit) => hit._id);

        matchingContent.hits.forEach((content) => {
            const children = contentLib.getChildren({ key: content._id });
            if (children.total > 0) {
                logger.info(`Found ${children.total} for ${content._path}`);
            }
        });

        // const unpublished = contentLib.unpublish({
        //     keys: idsToUnpublish,
        // });

        // logger.info(`Unpublished: ${unpublished}`);

        persistLogs(matchingContent);
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
