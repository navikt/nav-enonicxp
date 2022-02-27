import contentLib, { Content } from '/lib/xp/content';
import schedulerLib from '/lib/xp/scheduler';
import httpClient from '/lib/http-client';
import { urls } from '../constants';
import { clusterInfo, ClusterState, requestClusterInfo } from '../cluster/cluster-utils';
import { getPrepublishJobName, getUnpublishJobName } from '../siteCache/scheduled-publish';
import { runInBranchContext } from '../utils/branch-context';
import { RepoBranch } from '../../types/common';
import { hasCustomPath } from '../custom-paths/custom-paths';

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

type SiteInfo = {
    publishScheduled: ContentSummary[];
    unpublishScheduled: ContentSummary[];
    recentlyPublished: ContentSummary[];
    contentWithCustomPath: ContentSummary[];
    serverInfo: {
        serverName: string;
        clusterState?: ClusterState;
    };
};

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
        customPath: hasCustomPath(content) ? content.data.customPath : undefined,
        displayName: content.displayName,
        type: content.type,
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

export const get = () => {
    const currentTime = new Date().toISOString();
    const currentTimeMinusOneDay = new Date(Date.now() - 1000 * 3600 * 24).toISOString();

    const contentToPublish = contentQuery(
        `publish.from > instant("${currentTime}")`,
        'draft',
        'publish.from ASC'
    );

    const contentToUnpublish = contentQuery(
        `publish.to > instant("${currentTime}")`,
        'master',
        'publish.to ASC'
    );

    const recentlyPublished = contentQuery(
        `range("publish.from", instant("${currentTimeMinusOneDay}"), instant("${currentTime}"))`,
        'master',
        'publish.from ASC'
    );

    const contentWithCustomPath = contentQuery(
        'data.customPath LIKE "*"',
        'master',
        'data.customPath'
    ).filter((content) => !!content.customPath);

    const clusterInfoResponse = requestClusterInfo();

    const requestBody: SiteInfo = {
        publishScheduled: contentToPublish,
        unpublishScheduled: contentToUnpublish,
        recentlyPublished,
        contentWithCustomPath,
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
