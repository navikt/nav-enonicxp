import { AuditLog as _AudigLog } from '/lib/xp/auditlog';
import { ArrayOrSingle } from '../../../../types/util-types';

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
    modifiedTimeRaw: string;
    modifiedTime: string;
    status: string;
    title: string;
    url: string;
};

export type ContentLogData = {
    contentId: string;
    repoId: string;
    time: string;
    publish: {
        from?: string;
        to?: string;
    };
};
