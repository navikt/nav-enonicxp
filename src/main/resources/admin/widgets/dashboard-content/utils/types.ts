import { AuditLog as _AudigLog } from '/lib/xp/auditlog';
import { ArrayOrSingle } from '../../../../types/util-types';
import { Dayjs } from '/assets/dayjs/1.11.9/dayjs.min.js';

type AuditLog<Data extends _AudigLog['data']> = Omit<_AudigLog<Data>, 'objects'> & {
    objects: ArrayOrSingle<_AudigLog['objects'][number]>;
};

type AuditLogDataPublished = {
    params: {
        contentIds: ArrayOrSingle<string>;
        contentPublishInfo?: {
            from?: string;
            to?: string;
        };
    };
    result: {
        pushedContents?: ArrayOrSingle<string>;
    };
};

type AuditLogDataUnpublished = {
    params: {
        contentIds: ArrayOrSingle<string>;
    };
    result: {
        unpublishedContents?: ArrayOrSingle<string>;
    };
};

type AuditLogDataArchived = {
    params: {
        contentId: string;
    };
    result: {
        archivedContents?: ArrayOrSingle<string>;
        unpublishedContents?: ArrayOrSingle<string>;
    };
};

export type AuditLogPublished = AuditLog<AuditLogDataPublished> & {
    type: 'system.content.publish';
};
export type AuditLogUnpublished = AuditLog<AuditLogDataUnpublished> & {
    type: 'system.content.unpublishContent';
};
export type AuditLogArchived = AuditLog<AuditLogDataArchived> & { type: 'system.content.archive' };

export type AuditLogEntry = AuditLogPublished | AuditLogUnpublished | AuditLogArchived;

export type DashboardContentInfo = {
    displayName: string;
    contentType: string;
    modifiedTimeStr: string;
    modifyDate: Dayjs | string | undefined;
    status: string;
    title: string;
    url: string;
};
