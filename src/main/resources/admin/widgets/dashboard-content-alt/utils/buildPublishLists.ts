import { UserKey } from '/lib/xp/auditlog';
import { DashboardContentAuditLogListsBuilder } from './audit-log/auditlog-lists-builder';
import { dashboardContentResolveLogs } from './contentResolver';
import { DashboardContentInfo } from './types';

const sortDecending = (a: DashboardContentInfo, b: DashboardContentInfo) =>
    a.modifiedTimeRaw > b.modifiedTimeRaw ? -1 : 1;

const sortAscending = (a: DashboardContentInfo, b: DashboardContentInfo) =>
    a.modifiedTimeRaw < b.modifiedTimeRaw ? -1 : 1;

export const dashboardContentBuildPublishLists = (user: UserKey) => {
    const auditLogResolver = new DashboardContentAuditLogListsBuilder({
        user,
    });

    const { publishedData, prepublishedData, unpublishedData } = auditLogResolver.build();

    const published = dashboardContentResolveLogs(publishedData, true);
    const prePublished = dashboardContentResolveLogs(prepublishedData, true);
    const unPublished = dashboardContentResolveLogs(unpublishedData, false);

    return {
        published: published.sort(sortDecending),
        prePublished: prePublished.sort(sortAscending),
        unPublished: unPublished.sort(sortDecending),
    };
};
