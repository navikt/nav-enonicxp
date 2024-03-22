import { UserKey } from '/lib/xp/auditlog';
import { DashboardContentAuditLogResolver } from './auditLogResolver';
import { dashboardContentResolveLogs } from './contentResolver';
import { DashboardContentInfo } from './types';

const sortDecending = (a: DashboardContentInfo, b: DashboardContentInfo) =>
    a.modifiedTimeRaw > b.modifiedTimeRaw ? -1 : 1;

const sortAscending = (a: DashboardContentInfo, b: DashboardContentInfo) =>
    a.modifiedTimeRaw < b.modifiedTimeRaw ? -1 : 1;

export const dashboardContentBuildPublishLists = (user: UserKey) => {
    const auditLogResolver = new DashboardContentAuditLogResolver({
        user,
    });

    const { publishedData, prepublishedData, unpublishedData } = auditLogResolver.resolve();

    const published = dashboardContentResolveLogs(publishedData, true);
    const prePublished = dashboardContentResolveLogs(prepublishedData, true);
    const unPublished = dashboardContentResolveLogs(unpublishedData, false);

    return {
        published: published.sort(sortDecending),
        prePublished: prePublished.sort(sortAscending),
        unPublished: unPublished.sort(sortDecending),
    };
};
