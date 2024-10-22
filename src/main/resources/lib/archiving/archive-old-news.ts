import { QueryDsl } from '/lib/xp/node';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { APP_DESCRIPTOR } from '../constants';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { MainArticle } from '@xp-types/site/content-types';
import { runInContext } from '../context/run-in-context';
import { findAndArchiveOldContent } from './archive-utils';

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

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
            maxAgeMs: TWO_YEARS_MS,
            jobName: 'pressReleases',
        });

        findAndArchiveOldContent({
            query: newsQuery,
            maxAgeMs: ONE_YEAR_MS,
            jobName: 'news',
        });
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
