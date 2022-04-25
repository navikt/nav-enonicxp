import contentLib, { Content } from '/lib/xp/content';
import schedulerLib from '/lib/xp/scheduler';
import httpClient from '/lib/http-client';
import cacheLib from '/lib/cache';
import { urls } from '../constants';
import { clusterInfo, ClusterState, requestClusterInfo } from '../utils/cluster-utils';
import { getPrepublishJobName, getUnpublishJobName } from '../scheduling/scheduled-publish';
import { runInBranchContext } from '../utils/branch-context';
import { RepoBranch } from '../../types/common';
import { hasValidCustomPath } from '../custom-paths/custom-paths';

const frontendApiUrl = `${urls.frontendOrigin}/editor/site-info`;

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

const cache = cacheLib.newCache({
    size: 1,
    expire: 3600,
});

const cacheKey = 'content-lists';

const isFuture = (dateTime?: string) => dateTime && Date.now() < new Date(dateTime).getTime();

const getPublishInfo = (content: Content): PublishInfo => {
    const publish: PublishInfo = {
        ...content.publish,
    };

    if (isFuture(publish.from)) {
        const scheduledJob = schedulerLib.get({ name: getPrepublishJobName(content._id) });
        if (scheduledJob) {
            publish.scheduledFrom = scheduledJob.schedule.value;
        }
    }

    if (isFuture(publish.to)) {
        const scheduledJob = schedulerLib.get({ name: getUnpublishJobName(content._id) });
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
    runInBranchContext(
        () =>
            contentLib
                .query({
                    count: 10000,
                    query,
                    sort,
                })
                .hits.map(transformContent),
        branch
    );

const getContentLists = () =>
    cache.get(cacheKey, (): ContentLists => {
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
    });

export const clearSiteinfoCache = () => cache.clear();

export const get = (req: XP.Request) => {
    if (req.method !== 'GET') {
        return {
            status: 200,
        };
    }

    const clusterInfoResponse = requestClusterInfo();

    const contentLists = getContentLists();

    const requestBody: SiteInfo = {
        ...contentLists,
        serverInfo: {
            serverName: clusterInfo.localServerName,
            clusterState: clusterInfoResponse?.state,
        },
    };

    const frontendResponse = httpClient.request({
        url: frontendApiUrl,
        method: 'POST',
        contentType: 'application/json',
        headers: { secret: app.config.serviceSecret },
        body: JSON.stringify(requestBody),
    });

    return {
        body: frontendResponse.body,
        contentType: 'text/html; charset=UTF-8',
    };
};
