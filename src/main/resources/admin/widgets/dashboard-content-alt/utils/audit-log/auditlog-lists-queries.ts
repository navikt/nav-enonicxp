import { AuditLogQueryProps, getAuditLogEntries } from './auditlog-query';

type Props = Required<Pick<AuditLogQueryProps, 'from' | 'user' | 'count'>>;

export const auditLogGetPrepublishEntries = ({ from, user, count }: Props) => {
    const now = new Date().toISOString();

    return getAuditLogEntries({
        count,
        user,
        from,
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

export const auditLogGetPublishEntries = ({ from, user, count }: Props) => {
    const now = new Date().toISOString();

    return getAuditLogEntries({
        count,
        user,
        from,
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

export const auditLogGetUnpublishEntries = ({ from, user, count }: Props) => {
    return getAuditLogEntries({
        count,
        user,
        from,
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

export const auditLogGetArchiveEntries = ({ from, user, count }: Props) => {
    return getAuditLogEntries({
        count,
        user,
        from,
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
