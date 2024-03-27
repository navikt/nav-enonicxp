import { getRepoConnection } from '../../../../lib/utils/repo-utils';
import { UserKey } from '/lib/xp/auditlog';
import { AuditLogArchived, AuditLogPublished, AuditLogUnpublished } from './types';
import { Dayjs } from '/assets/dayjs/1.11.9/dayjs.min.js';
import { forceArray } from '../../../../lib/utils/array-utils';
import { Filter } from '/lib/xp/content';

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
    logTsFrom?: Dayjs;
    logTsTo?: Dayjs;
    publishFrom?: Dayjs;
    publishTo?: Dayjs;
    query?: string;
};

export const getAuditLogEntries = <Type extends AuditLogQueryType>({
    type,
    count,
    user,
    logTsFrom,
    logTsTo,
    publishFrom,
    publishTo,
    query,
}: AuditLogQueryProps<Type>): Array<ReturnTypeMap[Type]> => {
    const repoConnection = getRepoConnection({
        repoId: AUDITLOG_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });

    const mustTerms: Filter[] = [];

    if (user) {
        mustTerms.push({
            hasValue: {
                field: 'user',
                values: [user],
            },
        });
    }

    if (type) {
        mustTerms.push({
            hasValue: {
                field: 'type',
                values: [queryTypeToLogType[type]],
            },
        });
    }

    const hitIds = repoConnection
        .query({
            count,
            query: buildQueryString(logTsFrom, logTsTo, query),
            sort: 'time DESC',
            filters: {
                boolean: {
                    must: mustTerms,
                },
            },
        })
        .hits.map((hit) => hit.id);

    return forceArray(repoConnection.get(hitIds));
};

const queryTypeToLogType: Record<AuditLogQueryType, string> = {
    publish: 'system.content.publish',
    unpublish: 'system.content.unpublishContent',
    archive: 'system.content.archive',
};

const buildRangeQuery = (from?: Dayjs, to?: Dayjs) => {
    if (!from && !to) {
        return null;
    }

    const fromStr = from ? `instant("${from.toISOString()}")` : "''";
    const toStr = to ? `instant("${to.toISOString()}")` : "''";

    return `range('time', ${fromStr}, ${toStr})`;
};

const buildQueryString = (from?: Dayjs, to?: Dayjs, query?: string) => {
    const queryArray: string[] = [];

    const rangeQuery = buildRangeQuery(from, to);

    if (rangeQuery) {
        queryArray.push(rangeQuery);
    }

    if (query) {
        queryArray.push(query);
    }

    return queryArray.length > 0 ? queryArray.join(' AND ') : undefined;
};
