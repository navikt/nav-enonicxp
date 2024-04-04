import { UserKey } from '/lib/xp/auditlog';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import { AuditLogEntry, ContentLogData } from '../types';
import { AuditLogQueryProps } from './auditlog-query';
import { forceArray } from '../../../../../lib/utils/array-utils';
import { logger } from '../../../../../lib/utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../../../../../lib/constants';
import {
    auditLogGetPrepublishEntries,
    auditLogGetPublishEntries,
    auditLogGetUnpublishEntries,
} from './auditlog-lists-queries';

type QueryProps = Required<Pick<AuditLogQueryProps, 'from' | 'user' | 'count'>>;

type ContentLogsMap = Record<string, ContentLogData>;

type ConstructorProps = {
    user: UserKey;
};

const COUNT = 100;

export class DashboardContentLogListsBuilder {
    private readonly queryProps: QueryProps;

    private publishLogs: ContentLogsMap = {};
    private prepublishLogs: ContentLogsMap = {};
    private unpublishLogs: ContentLogsMap = {};

    constructor({ user }: ConstructorProps) {
        this.queryProps = {
            user,
            count: COUNT,
            from: getFromDate(),
        };
    }

    public build() {
        const publishedAuditlogs = auditLogGetPublishEntries(this.queryProps);
        const prepublishAuditlog = auditLogGetPrepublishEntries(this.queryProps);
        const unpublishAuditlog = auditLogGetUnpublishEntries(this.queryProps);

        logger.info(`Found ${publishedAuditlogs.length} publish entries`);
        logger.info(`Found ${prepublishAuditlog.length} prepublish entries`);
        logger.info(`Found ${unpublishAuditlog.length} unpublish entries`);

        this.publishLogs = transformToLogsMap(publishedAuditlogs);
        this.prepublishLogs = transformToLogsMap(prepublishAuditlog);
        this.unpublishLogs = transformToLogsMap(unpublishAuditlog);

        return {
            publishLogs: this.getFilteredPublishLogs(),
            prepublishLogs: this.getFilteredPrepublishLogs(),
            unpublishLogs: this.getFilteredUnpublishLogs(),
        };
    }

    private getFilteredPublishLogs() {
        // Skal ikke være avpublisert igjen senere av user (men kan være avpublisert av andre)
        // Skal ikke avvente forhåndspublisering
        return Object.values(this.publishLogs).filter(
            (publishLog) => !this.isUnpublished(publishLog) && !this.isPrepublished(publishLog)
        );
    }

    private getFilteredPrepublishLogs() {
        // Skal ikke være avpublisert igjen senere av user (men kan være avpublisert av andre)
        return Object.values(this.prepublishLogs).filter(
            (prepublishLog) => !this.isUnpublished(prepublishLog)
        );
    }

    private getFilteredUnpublishLogs() {
        // Skal ikke være publisert igjen senere av user (men kan være publisert av andre)
        return Object.values(this.unpublishLogs).filter(
            (unpublishLog) => !this.isPublished(unpublishLog) && !this.isPrepublished(unpublishLog)
        );
    }

    private isPublished(contentLog: ContentLogData) {
        const key = getKey(contentLog);
        const publishLog = this.publishLogs[key];
        return publishLog && publishLog.time > contentLog.time;
    }

    private isPrepublished(contentLog: ContentLogData) {
        const key = getKey(contentLog);
        const prepublishLog = this.prepublishLogs[key];
        return prepublishLog && prepublishLog.time > contentLog.time;
    }

    private isUnpublished(contentLog: ContentLogData) {
        const key = getKey(contentLog);
        const unpublishLog = this.unpublishLogs[key];
        return unpublishLog && unpublishLog.time > contentLog.time;
    }
}

// Transform the auditlog entries to a map, keeping only the newest entry for each content
const transformToLogsMap = (auditLogEntries: AuditLogEntry[]): ContentLogsMap => {
    const logsTransformed = auditLogEntries.map(transformAuditlog).flat();

    return logsTransformed.reduce<ContentLogsMap>((acc, contentLog) => {
        const key = getKey(contentLog);
        if (!acc[key]) {
            acc[key] = contentLog;
        }
        return acc;
    }, {});
};

// Transform the data from the audit log to a common format for all entry types
const transformAuditlog = (entry: AuditLogEntry): ContentLogData[] => {
    const { type, data, time } = entry;

    const isPublishLog = type === 'system.content.publish';

    const publish = (isPublishLog && data.params.contentPublishInfo) || {};
    const contentIds = isPublishLog ? data.result.pushedContents : data.result.unpublishedContents;

    const objects = forceArray(entry.objects);

    return forceArray(contentIds).map((contentId) => ({
        contentId,
        time,
        publish,
        repoId: getRepoIdForContentId(objects, contentId),
        isArchived: entry.type === 'system.content.archive',
    }));
};

// The "objects" array contains references formatted like this:
// <repo id>:<repo branch>:<content id>
// Contents that were indirectly (un)published (ie via a "publish tree" action) may not have
// an objects entry, so we have fallbacks for this case.
const getRepoIdForContentId = (objects: string[], contentId: string): string => {
    const foundObject =
        objects.find((object) => {
            const [_repoId, _branch, objContentId] = object.split(':');
            return objContentId === contentId;
        }) || objects[0];

    if (!foundObject) {
        logger.warning(`No repoId found in auditlog entry for ${contentId}`);
        return CONTENT_ROOT_REPO_ID;
    }

    return objects[0].split(':')[0];
};

const getKey = (entry: ContentLogData) => `${entry.repoId}-${entry.contentId}`;

const getFromDate = () => dayjs().subtract(6, 'months');
