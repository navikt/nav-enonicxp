import { UserKey } from '/lib/xp/auditlog';
import { Dayjs } from '/assets/dayjs/1.11.9/dayjs.min.js';
import { AuditLogArchived, AuditLogPublished, AuditLogUnpublished } from './types';
import { getAuditLogEntries } from './auditLogQuery';

type QueryProps = {
    user: UserKey;
    count: number;
    from?: Dayjs;
    to?: Dayjs;
};

type ConstructorProps = QueryProps;

export class DashboardContentAuditLogEntries {
    private readonly queryProps: QueryProps;

    private publishedLogEntries: AuditLogPublished[] = [];
    private unPublishedLogEntries: AuditLogUnpublished[] = [];
    private archivedLogEntries: AuditLogArchived[] = [];

    constructor({ user, count, from, to }: ConstructorProps) {
        this.queryProps = {
            user,
            count,
            from,
            to,
        };
    }

    public build() {
        this.publishedLogEntries = getAuditLogEntries({
            ...this.queryProps,
            type: 'publish',
        });

        this.unPublishedLogEntries = getAuditLogEntries({
            ...this.queryProps,
            type: 'unpublish',
        });

        this.archivedLogEntries = getAuditLogEntries({
            ...this.queryProps,
            type: 'archive',
        });

        return {
            published: this.getPublishedContent(),
            unpublished: this.getUnpublishedContent(),
            prepublished: this.getPrepublishedContent(),
        };
    }

    private getPublishedContent() {
        // Skal være publisert
        // Skal ikke være arkivert
        // Skal ikke være forhåndspublisert
    }

    private getUnpublishedContent() {
        // Skal ikke være publisert
    }

    private getPrepublishedContent() {
        // Skal være avventende forhåndspublisering
    }
}
