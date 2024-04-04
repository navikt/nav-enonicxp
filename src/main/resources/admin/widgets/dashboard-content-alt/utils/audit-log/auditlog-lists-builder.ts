import { UserKey } from '/lib/xp/auditlog';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import {
    AuditLogArchived,
    AuditLogEntry,
    AuditLogPublished,
    AuditLogUnpublished,
    ContentLogData,
} from '../types';
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

export class DashboardContentAuditLogListsBuilder {
    private readonly queryProps: QueryProps;

    private publishedData: ContentLogsMap = {};
    private prepublishedData: ContentLogsMap = {};
    private unpublishedData: ContentLogsMap = {};

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

        this.publishedData = buildLogsDataMap(publishedAuditlogs);
        this.prepublishedData = buildLogsDataMap(prepublishAuditlog);
        this.unpublishedData = buildLogsDataMap(unpublishAuditlog);

        return {
            publishedData: this.filterPublishedData(),
            prepublishedData: this.filterPrepublishedData(),
            unpublishedData: this.filterUnpublishedData(),
        };
    }

    private filterPublishedData() {
        // Skal ikke være avpublisert igjen senere av user (men kan være avpublisert av andre)
        // Skal ikke avvente forhåndspublisering
        return Object.values(this.publishedData).filter(
            (publishedEntry) =>
                !this.isUnpublished(publishedEntry) && !this.isPrepublished(publishedEntry)
        );
    }

    private filterUnpublishedData() {
        // Skal være avpublisert av user
        // Skal ikke være publisert igjen senere av user (men kan være publisert av andre)
        return Object.values(this.unpublishedData).filter(
            (unPublishedEntry) =>
                !this.isPublished(unPublishedEntry) && !this.isPrepublished(unPublishedEntry)
        );
    }

    private filterPrepublishedData() {
        // Skal ikke være avpublisert igjen senere av user (men kan være avpublisert av andre)
        return Object.values(this.prepublishedData).filter(
            (prePublishedEntry) => !this.isUnpublished(prePublishedEntry)
        );
    }

    private isPublished(entry: ContentLogData) {
        const key = getKey(entry);
        const publishedEntry = this.publishedData[key];
        return publishedEntry && publishedEntry.time > entry.time;
    }

    private isUnpublished(entry: ContentLogData) {
        const key = getKey(entry);
        const unpublishedEntry = this.unpublishedData[key];
        return unpublishedEntry && unpublishedEntry.time > entry.time;
    }

    private isPrepublished(entry: ContentLogData) {
        const key = getKey(entry);
        return !!this.prepublishedData[key];
    }
}

const buildLogsDataMap = (auditLogEntries: AuditLogEntry[]): ContentLogsMap => {
    const logsTransformed = auditLogEntries.map(transformAuditlog).flat();

    return logsTransformed.reduce<ContentLogsMap>((acc, entry) => {
        const key = getKey(entry);
        if (!acc[key]) {
            acc[key] = entry;
        }
        return acc;
    }, {});
};

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

const getRepoIdForContentId = (objects: string[], contentId: string): string => {
    for (const object of objects) {
        const [repoId, branch, objContentId] = object.split(':');
        if (objContentId === contentId) {
            return repoId;
        }
    }

    logger.warning(`No repoId found for ${contentId} in objects: ${objects.join(', ')}`);

    return CONTENT_ROOT_REPO_ID;
};

const getKey = (entry: ContentLogData) => `${entry.repoId}-${entry.contentId}`;

const getFromDate = () => dayjs().subtract(6, 'months');
