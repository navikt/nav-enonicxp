import contentLib, { Content } from '/lib/xp/content';
import schedulerLib from '/lib/xp/scheduler';
import httpClient from '/lib/http-client';
import { urls } from '../constants';
import { clusterInfo, ClusterState } from '../cluster/cluster-utils';
import { getPrepublishJobName, getUnpublishJobName } from '../siteCache/scheduled-publish';
import { runInBranchContext } from '../utils/branch-context';

const frontendApiUrl = `${urls.frontendOrigin}/api/site-info-html`;

type PublishInfo = Content['publish'] & {
    scheduledFrom?: string;
    scheduledTo?: string;
};

type ContentSummary = {
    id: string;
    path: string;
    displayName: string;
    type: string;
    publish: PublishInfo;
};

type RequestBody = {
    publishScheduled: ContentSummary[];
    unpublishScheduled: ContentSummary[];
    serverInfo: {
        serverName: string;
        clusterState: ClusterState;
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
        displayName: content.displayName,
        type: content.type,
        publish: getPublishInfo(content),
    };
};

const contentQuery = (query: string) =>
    runInBranchContext(
        () =>
            contentLib
                .query({
                    count: 10000,
                    query,
                })
                .hits.map(transformContent),
        'master'
    );

export const get = (req: XP.Request) => {
    const contentToPublish = contentQuery(`publish.from > instant("${new Date().toISOString()}")`);

    const contentToUnpublish = contentQuery(`publish.to > instant("${new Date().toISOString()}")`);

    const requestBody: RequestBody = {
        publishScheduled: contentToPublish,
        unpublishScheduled: contentToUnpublish,
        serverInfo: {
            serverName: clusterInfo.localServerName,
            clusterState: clusterInfo.clusterState,
        },
    };

    const frontendResponse = httpClient.request({
        url: frontendApiUrl,
        method: 'POST',
        contentType: 'text/html',
        headers: { secret: app.config.serviceSecret },
        body: JSON.stringify(requestBody),
    });

    return {
        body: frontendResponse.body,
        contentType: 'text/html; charset=UTF-8',
    };
};
