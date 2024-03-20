import { UserKey } from '/lib/xp/auditlog';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import { AuditLogEntry } from './types';
import { getAuditLogEntries } from './auditLogQuery';

type ConstructorProps = {
    user: UserKey;
    count: number;
};

export class DashboardContentAuditLogEntries {
    private readonly user: UserKey;
    private readonly count: number;

    private publishedEntriesAll: AuditLogEntry[] = [];
    private unPublishedEntriesAll: AuditLogEntry[] = [];
    private archivedEntriesAll: AuditLogEntry[] = [];

    constructor({ user, count }: ConstructorProps) {
        this.user = user;
        this.count = count;
    }

    public build() {
        this.publishedEntriesAll = this.getEntries('system.content.publish');
        this.unPublishedEntriesAll = this.getEntries('system.content.unpublishContent');
        this.archivedEntriesAll = this.getEntries('system.content.archive');
    }

    private getPublishedContent() {
        // Skal ikke være arkivert
        // Skal ikke være forhåndspublisert

        const auditLogEntries = this.getEntries('system.content.publish');
    }

    private getUnpublishedEntries() {}

    private getArchivedEntries() {}

    private getEntries(type: string, query?: string) {
        const finalQuery = [getRangeQuery()];
        if (query) {
            finalQuery.push(query);
        }

        return getAuditLogEntries({
            user: this.user,
            count: this.count,
            type,
            query: finalQuery.join(' AND '),
        });
    }
}

// Går bare 6 måneder tilbake i tid
const getRangeQuery = () => {
    const from = dayjs().subtract(6, 'months').toISOString();
    return `range('time', instant('${from}'), '')`;
};
