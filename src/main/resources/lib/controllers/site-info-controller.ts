import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as schedulerLib from '/lib/xp/scheduler';
import httpClient from '/lib/http-client';
import { CONTENT_ROOT_REPO_ID, URLS } from '../constants';
import { clusterInfo, ClusterState, requestClusterInfo } from '../cluster-utils/cluster-api';
import { getPrepublishJobName, getUnpublishJobName } from '../scheduling/scheduled-publish';
import { RepoBranch } from '../../types/common';
import { hasValidCustomPath } from '../paths/custom-paths/custom-path-utils';
import { runInContext } from '../context/run-in-context';
import { getFromLocalCache } from '../cache/local-cache';
import { buildCacheKeyForReqContext } from '../cache/utils';

const FRONTEND_API_URL = `${URLS.FRONTEND_ORIGIN}/editor/site-info`;
const CACHE_KEY = 'content-lists';

type PublishInfo = Content['publish'] & {
    scheduledFrom?: string;
    scheduledTo?: string;
};

type ContentSummary = {
    id: string;
    path: string;
    customPath?: string;
    displayName: string;
    type: string;
    publish: PublishInfo;
};

type ContentLists = {
    publishScheduled: ContentSummary[];
    unpublishScheduledNextWeek: ContentSummary[];
    unpublishScheduledLater: ContentSummary[];
    recentlyPublished: ContentSummary[];
    contentWithCustomPath: ContentSummary[];
};

type SiteInfo = {
    serverInfo: {
        serverName: string;
        clusterState?: ClusterState;
    };
} & ContentLists;

const isFuture = (dateTime?: string) => dateTime && Date.now() < new Date(dateTime).getTime();

const getScheduledJob = (jobName: string) => {
    return runInContext({ asAdmin: true }, () => {
        const scheduledJob = schedulerLib.get({ name: jobName });
        return scheduledJob;
    });
};

// TODO: support for content from layers
const getPublishInfo = (content: Content): PublishInfo => {
    const publish: PublishInfo = {
        ...content.publish,
    };

    if (isFuture(publish.from)) {
        const jobName = getPrepublishJobName(content._id);
        const jobNameWithRepo = getPrepublishJobName(content._id, CONTENT_ROOT_REPO_ID);

        const scheduledJob = getScheduledJob(jobNameWithRepo) || getScheduledJob(jobName);

        if (scheduledJob) {
            publish.scheduledFrom = scheduledJob.schedule.value;
        }
    }

    if (isFuture(publish.to)) {
        const jobName = getUnpublishJobName(content._id);
        const jobNameWithRepo = getUnpublishJobName(content._id, CONTENT_ROOT_REPO_ID);

        const scheduledJob = getScheduledJob(jobNameWithRepo) || getScheduledJob(jobName);

        if (scheduledJob) {
            publish.scheduledTo = scheduledJob.schedule.value;
        }
    }

    return publish;
};

const transformContent = (content: Content): ContentSummary => {
    return {
        id: content._id,
        path: content._path,
        customPath: hasValidCustomPath(content) ? content.data.customPath : undefined,
        displayName: content.displayName,
        type: contentLib.getType(content.type)?.displayName || '',
        publish: getPublishInfo(content),
    };
};

const contentQuery = (query: string, branch: RepoBranch, sort?: string) =>
    runInContext({ branch }, () =>
        contentLib
            .query({
                count: 1000,
                query,
                sort,
            })
            .hits.map(transformContent)
    );

const getContentLists = (): ContentLists => {
    const currentTime = new Date().toISOString();
    const currentTimeMinusOneDay = new Date(Date.now() - 1000 * 3600 * 24).toISOString();
    const currentTimePlusOneWeek = new Date(Date.now() + 1000 * 3600 * 24 * 7).toISOString();

    const publishScheduled = contentQuery(
        `publish.from > instant("${currentTime}")`,
        'draft',
        'publish.from ASC'
    );

    const unpublishScheduledNextWeek = contentQuery(
        `publish.to <= instant("${currentTimePlusOneWeek}")`,
        'master',
        'publish.to ASC'
    );

    const unpublishScheduledLater = contentQuery(
        `publish.to > instant("${currentTimePlusOneWeek}")`,
        'master',
        'publish.to ASC'
    );

    const recentlyPublished = contentQuery(
        `range("publish.from", instant("${currentTimeMinusOneDay}"), instant("${currentTime}"))`,
        'master',
        'publish.from DESC'
    );

    const contentWithCustomPath = contentQuery(
        'data.customPath LIKE "*"',
        'master',
        'data.customPath'
    ).filter((content) => !!content.customPath);

    return {
        publishScheduled,
        unpublishScheduledNextWeek,
        unpublishScheduledLater,
        recentlyPublished,
        contentWithCustomPath,
    };
};

export const get = (req: XP.Request) => {
    if (req.method !== 'GET') {
        return {
            status: 200,
        };
    }

    const clusterInfoResponse = requestClusterInfo();

    const contentLists = getFromLocalCache(
        buildCacheKeyForReqContext(req, CACHE_KEY),
        getContentLists
    );

    const requestBody: SiteInfo = {
        ...contentLists,
        serverInfo: {
            serverName: clusterInfo.localServerName,
            clusterState: clusterInfoResponse?.state,
        },
    };

    return httpClient.request({
        url: FRONTEND_API_URL,
        method: 'POST',
        contentType: 'application/json',
        headers: { secret: app.config.serviceSecret },
        body: JSON.stringify(requestBody),
    });
};
