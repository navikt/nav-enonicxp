import { UserKey } from '/lib/xp/auditlog';
import { DashboardContentLogListsBuilder } from './audit-log/auditlog-lists-builder';
import { dashboardContentResolveLogs } from './contentResolver';
import { DashboardContentInfo } from './types';

const sortDecending = (a: DashboardContentInfo, b: DashboardContentInfo) =>
    a.modifiedTimeRaw > b.modifiedTimeRaw ? -1 : 1;

const sortAscending = (a: DashboardContentInfo, b: DashboardContentInfo) =>
    a.modifiedTimeRaw < b.modifiedTimeRaw ? -1 : 1;

export const dashboardContentBuildPublishLists = (user: UserKey) => {
    const logsListsBuilder = new DashboardContentLogListsBuilder({
        user,
    });

    const { publishLogs, prepublishLogs, unpublishLogs } = logsListsBuilder.build();

    const published = dashboardContentResolveLogs(publishLogs, true);
    const prePublished = dashboardContentResolveLogs(prepublishLogs, true);
    const unPublished = dashboardContentResolveLogs(unpublishLogs, false);

    return {
        published: published.sort(sortDecending),
        prePublished: prePublished.sort(sortDecending),
        unPublished: unPublished.sort(sortDecending),
    };
};
