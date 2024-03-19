import { getRepoConnection } from '../../../../lib/utils/repo-utils';
import { UserKey } from '/lib/xp/auditlog';
import { AuditLogEntry } from '../dashboard-content';

const AUDITLOG_REPO_ID = 'system.auditlog';

type Args = {
    type: string;
    count: number;
    from: string;
    user: UserKey;
};

export const getAuditLogEntries = ({ type, count, user, from }: Args): AuditLogEntry[] => {
    const repoConnection = getRepoConnection({
        repoId: AUDITLOG_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });

    const hitIds = repoConnection
        .query({
            count,
            query: `range('time', instant('${from}'), '')`,
            sort: 'DESC time',
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
                                values: [type],
                            },
                        },
                    ],
                },
            },
        })
        .hits.map((hit) => hit.id);

    return repoConnection.get(hitIds) || [];
};
