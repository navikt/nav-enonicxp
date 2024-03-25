import { UserKey } from '/lib/xp/auditlog';
import dayjs, { Dayjs } from '/assets/dayjs/1.11.9/dayjs.min.js';
import { AuditLogArchived, AuditLogPublished, AuditLogUnpublished, ContentLogData } from './types';
import { getAuditLogEntries } from './auditLogQuery';
import { forceArray } from '../../../../lib/utils/array-utils';
import { logger } from '../../../../lib/utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../../../../lib/constants';

type QueryProps = {
    user: UserKey;
    count: number;
    from?: Dayjs;
};

type ContentLogsMap = Record<string, ContentLogData>;

type ConstructorProps = {
    user: UserKey;
};

const COUNT = 100;

export class DashboardContentAuditLogResolver {
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

    public resolve() {
        const publishedLogEntries = getAuditLogEntries({
            ...this.queryProps,
            type: 'publish',
        });
        const unPublishedLogEntries = getAuditLogEntries({
            ...this.queryProps,
            type: 'unpublish',
        });
        const archivedLogEntries = getAuditLogEntries({
            ...this.queryProps,
            type: 'archive',
        });

        this.publishedData = buildContentLogsMap(
            publishedLogEntries.map(this.getPublishedContentData).flat()
        );
        this.prepublishedData = buildContentLogsMap(
            publishedLogEntries.map(this.getPrepublishedContentData).flat()
        );
        this.unpublishedData = buildContentLogsMap(
            [...unPublishedLogEntries, ...archivedLogEntries]
                .map(this.getUnpublishedContentData)
                .flat()
                .sort((a, b) => (a.time > b.time ? -1 : 1))
        );

        return {
            publishedData: this.cleanPublishedData(),
            prepublishedData: this.cleanPrepublishedData(),
            unpublishedData: this.cleanUnpublishedData(),
        };
    }

    private getPublishedContentData(entry: AuditLogPublished): ContentLogData[] {
        const { result, params } = entry.data;

        const publish = params.contentPublishInfo || {};
        const now = new Date().toISOString();

        if (publish.from && publish.from > now) {
            return [];
        }

        const pushedContents = forceArray(result?.pushedContents);
        const objects = forceArray(entry.objects);

        return pushedContents.map((contentId) => ({
            contentId,
            repoId: getRepoIdForContentId(objects, contentId),
            time: entry.time,
            publish: publish,
        }));
    }

    private getPrepublishedContentData(entry: AuditLogPublished): ContentLogData[] {
        const { result, params } = entry.data;

        const publish = params.contentPublishInfo || {};
        if (!publish.from) {
            return [];
        }

        const now = new Date().toISOString();

        if (publish.from < now) {
            return [];
        }

        const pushedContents = result?.pushedContents;
        const objects = forceArray(entry.objects);

        return forceArray(pushedContents).map((contentId) => ({
            contentId,
            repoId: getRepoIdForContentId(objects, contentId),
            time: entry.time,
            publish: publish,
        }));
    }

    private getUnpublishedContentData(
        entry: AuditLogUnpublished | AuditLogArchived
    ): ContentLogData[] {
        const pushedContents = entry.data.result?.unpublishedContents;
        const objects = forceArray(entry.objects);

        return forceArray(pushedContents).map((contentId) => ({
            contentId,
            repoId: getRepoIdForContentId(objects, contentId),
            time: entry.time,
            isArchived: entry.type === 'system.content.archive',
            publish: {},
        }));
    }

    private cleanPublishedData() {
        // Skal være publisert av user
        // Skal ikke være avpublisert igjen senere av user (men kan være avpublisert av andre)
        // Skal ikke avvente forhåndspublisering

        const cleanedList: ContentLogData[] = [];

        Object.entries(this.publishedData).forEach(([key, publishedEntry]) => {
            const unpublishedEntry = this.unpublishedData[key];
            if (unpublishedEntry && unpublishedEntry.time > publishedEntry.time) {
                return;
            }

            const prepublishedEntry = this.prepublishedData[key];
            if (!prepublishedEntry) {
                cleanedList.push(publishedEntry);
                return;
            }

            if (publishedEntry.time < prepublishedEntry.time) {
                return;
            }

            cleanedList.push(publishedEntry);
        });

        return cleanedList;
    }

    private cleanUnpublishedData() {
        // Skal være avpublisert av user
        // Skal ikke være publisert igjen senere av user (men kan være publisert av andre)

        const cleanedList: ContentLogData[] = [];

        Object.entries(this.unpublishedData).forEach(([key, unPublishedEntry]) => {
            const publishedEntry = this.publishedData[key];
            if (publishedEntry && publishedEntry.time > unPublishedEntry.time) {
                return;
            }

            const prepublishedEntry = this.prepublishedData[key];
            if (!prepublishedEntry) {
                cleanedList.push(unPublishedEntry);
                return;
            }

            if (unPublishedEntry.time < prepublishedEntry.time) {
                return;
            }

            cleanedList.push(unPublishedEntry);
        });

        return cleanedList;
    }

    private cleanPrepublishedData() {
        const cleanedList: ContentLogData[] = [];

        Object.entries(this.prepublishedData).forEach(([key, prePublishedEntry]) => {
            const publishedEntry = this.publishedData[key];
            if (publishedEntry && publishedEntry.time > prePublishedEntry.time) {
                return;
            }

            const unpublishedEntry = this.unpublishedData[key];
            if (unpublishedEntry) {
                return;
            }

            cleanedList.push(prePublishedEntry);
        });

        return cleanedList;
    }
}

const buildContentLogsMap = (contentLogData: ContentLogData[]): ContentLogsMap => {
    return contentLogData.reduce<ContentLogsMap>((acc, entry) => {
        const key = getKey(entry);
        if (!acc[key]) {
            acc[key] = entry;
        }
        return acc;
    }, {});
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

const getFromDate = () => dayjs().subtract(6, 'months'); // Går bare 6 måneder tilbake i tid
