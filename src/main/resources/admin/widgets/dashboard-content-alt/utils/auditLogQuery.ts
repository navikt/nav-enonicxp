import { QueryDsl, RangeDslExpression } from '/lib/xp/node';
import { UserKey } from '/lib/xp/auditlog';
import { getRepoConnection } from '../../../../lib/utils/repo-utils';
import { AuditLogArchived, AuditLogPublished, AuditLogUnpublished } from './types';
import { Dayjs } from '/assets/dayjs/1.11.9/dayjs.min.js';
import { forceArray } from '../../../../lib/utils/array-utils';

const AUDITLOG_REPO_ID = 'system.auditlog';

type AuditLogQueryType = 'publish' | 'unpublish' | 'archive';

type ReturnTypeMap = {
    publish: AuditLogPublished;
    unpublish: AuditLogUnpublished;
    archive: AuditLogArchived;
};

export type AuditLogQueryProps<Type extends AuditLogQueryType = AuditLogQueryType> = {
    type: Type;
    user: UserKey;
    count: number;
    from?: Dayjs;
    to?: Dayjs;
    queries?: QueryDsl[];
};

export const getAuditLogEntries = <Type extends AuditLogQueryType>({
    type,
    count,
    user,
    from,
    to,
    queries,
}: AuditLogQueryProps<Type>): Array<ReturnTypeMap[Type]> => {
    const repoConnection = getRepoConnection({
        repoId: AUDITLOG_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });

    const filter: QueryDsl[] = [
        ...(queries || []),
        {
            term: {
                field: 'user',
                value: user,
            },
        },
        {
            term: {
                field: 'type',
                value: queryTypeToLogType[type],
            },
        },
    ];

    const rangeQuery = buildRangeQuery(from, to);
    if (rangeQuery) {
        filter.push({ range: rangeQuery });
    }

    const hitIds = repoConnection
        .query({
            count,
            sort: 'time DESC',
            query: { boolean: { filter } },
        })
        .hits.map((hit) => hit.id);

    return forceArray(repoConnection.get(hitIds) as ReturnTypeMap[Type]);
};

const queryTypeToLogType: Record<AuditLogQueryType, string> = {
    publish: 'system.content.publish',
    unpublish: 'system.content.unpublishContent',
    archive: 'system.content.archive',
};

const buildRangeQuery = (from?: Dayjs, to?: Dayjs): RangeDslExpression | null => {
    if (!from && !to) {
        return null;
    }

    return {
        field: 'time',
        ...(from && { gte: from.toISOString() }),
        ...(to && { lt: to.toISOString() }),
    };
};
