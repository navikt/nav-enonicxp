import { getRepoConnection } from '../../../../lib/utils/repo-utils';
import { UserKey } from '/lib/xp/auditlog';
import { AuditLogArchived, AuditLogPublished, AuditLogUnpublished } from './types';

const AUDITLOG_REPO_ID = 'system.auditlog';

type QueryType = 'publish' | 'unpublish' | 'archive';

type ReturnTypes = {
    publish: AuditLogPublished;
    unpublish: AuditLogUnpublished;
    archive: AuditLogArchived;
};

type Props<Type extends QueryType> = {
    type: Type;
    user: UserKey;
    count: number;
    query?: string;
};

export const getAuditLogEntries = <Type extends QueryType>({
    type,
    count,
    user,
    query,
}: Props<Type>): Array<ReturnTypes[Type]> => {
    const repoConnection = getRepoConnection({
        repoId: AUDITLOG_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });

    const hitIds = repoConnection
        .query({
            count,
            query,
            sort: 'time DESC',
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'user',
                                values: [user],
                            },
                        },
                        {
                            hasValue: {
                                field: 'type',
                                values: [queryTypeToLogType[type]],
                            },
                        },
                    ],
                },
            },
        })
        .hits.map((hit) => hit.id);

    return repoConnection.get(hitIds) || [];
};

const queryTypeToLogType: Record<QueryType, string> = {
    publish: 'system.content.publish',
    unpublish: 'system.content.unpublishContent',
    archive: 'system.content.archive',
};
