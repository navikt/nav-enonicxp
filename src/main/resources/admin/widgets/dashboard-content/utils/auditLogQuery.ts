import { getRepoConnection } from '../../../../lib/utils/repo-utils';
import { UserKey } from '/lib/xp/auditlog';
import { AuditLogEntry } from './types';

const AUDITLOG_REPO_ID = 'system.auditlog';

type Props = {
    type: string;
    count: number;
    query: string;
    user: UserKey;
};

export const getAuditLogEntries = ({ type, count, user, query }: Props): AuditLogEntry[] => {
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
