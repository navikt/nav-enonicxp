import { AuditLogQueryProps, getAuditLogEntries } from './auditlog-query';

type Props = Required<Pick<AuditLogQueryProps, 'user' | 'count'>>;

export const auditLogGetActivePrepublishEntries = ({ user, count }: Props) => {
    const now = new Date().toISOString();

    return getAuditLogEntries({
        count,
        user,
        type: 'publish',
        queries: [
            {
                exists: {
                    field: 'data.result.pushedContents',
                },
            },
            {
                boolean: {
                    must: [
                        {
                            range: {
                                field: 'data.params.contentPublishInfo.from',
                                type: 'dateTime',
                                gte: now,
                            },
                        },
                    ],
                    mustNot: [
                        {
                            range: {
                                field: 'data.params.contentPublishInfo.to',
                                type: 'dateTime',
                                lt: now,
                            },
                        },
                    ],
                },
            },
        ],
    });
};

export const auditLogGetExpiredPrepublishEntries = ({ user, count }: Props) => {
    const now = new Date().toISOString();

    return getAuditLogEntries({
        count,
        user,
        type: 'publish',
        queries: [
            {
                exists: {
                    field: 'data.result.pushedContents',
                },
            },
            {
                boolean: {
                    must: [
                        {
                            range: {
                                field: 'data.params.contentPublishInfo.to',
                                type: 'dateTime',
                                lt: now,
                            },
                        },
                    ],
                },
            },
        ],
    });
};

export const auditLogGetPublishEntries = ({ user, count }: Props) => {
    const now = new Date().toISOString();

    return getAuditLogEntries({
        count,
        user,
        type: 'publish',
        queries: [
            {
                exists: {
                    field: 'data.result.pushedContents',
                },
            },
            {
                boolean: {
                    mustNot: [
                        {
                            range: {
                                field: 'data.params.contentPublishInfo.from',
                                type: 'dateTime',
                                gte: now,
                            },
                        },
                        {
                            range: {
                                field: 'data.params.contentPublishInfo.to',
                                type: 'dateTime',
                                lt: now,
                            },
                        },
                    ],
                },
            },
        ],
    });
};

export const auditLogGetUnpublishEntries = ({ user, count }: Props) => {
    return getAuditLogEntries({
        count,
        user,
        type: ['unpublish', 'archive'],
        queries: [
            {
                exists: {
                    field: 'data.result.unpublishedContents',
                },
            },
        ],
    });
};

export const auditLogGetArchiveEntries = ({ user, count }: Props) => {
    return getAuditLogEntries({
        count,
        user,
        type: 'archive',
        queries: [
            {
                exists: {
                    field: 'data.result.archivedContents',
                },
            },
        ],
    });
};
