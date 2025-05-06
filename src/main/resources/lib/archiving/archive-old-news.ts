import { QueryDsl } from '/lib/xp/node';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { APP_DESCRIPTOR } from '../constants';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { MainArticle } from '@xp-types/site/content-types';
import { runInContext } from '../context/run-in-context';
import { findAndArchiveOldContent } from './batch-archiving';

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;

const MONDAY_0500_CRON = '0 4 * * 1';

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
} as const;

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
} as const;

export const archiveOldNews = () =>
    runInContext({ asAdmin: true }, () => {
        findAndArchiveOldContent({
            query: pressReleasesQuery,
            maxAgeMs: ONE_YEAR_MS,
            jobName: 'pressReleases',
        });

        findAndArchiveOldContent({
            query: newsQuery,
            maxAgeMs: ONE_YEAR_MS,
            jobName: 'news',
        });
    });

export const activateArchiveNewsSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'archive-old-news',
        jobSchedule: {
            type: 'CRON',
            value: MONDAY_0500_CRON,
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${APP_DESCRIPTOR}:archive-old-news`,
        taskConfig: {},
    });
};
