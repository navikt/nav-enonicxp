import { RepoNode } from '/lib/xp/node';

type LayerMigration = {
    /**
     * Type (live eller arkivert)
     */
    targetReferenceType?: 'live' | 'archived';

    /**
     * Content id (viser til arkivert innhold fra live innhold og vice versa)
     */
    contentId: string;

    /**
     * Repo id (viser til arkivert innhold fra live innhold og vice versa)
     */
    repoId: string;

    /**
     * Locale (viser til arkivert innhold fra live innhold og vice versa)
     */
    locale: string;

    /**
     * Timestamp for migrering
     */
    ts: string;
};

type LayerMigrationParams = Omit<LayerMigration, 'ts'>;

export const insertLayerMigrationData = ({
    content,
    migrationParams,
}: {
    content: RepoNode<any>;
    migrationParams: LayerMigrationParams;
}) => {
    if (!content.data) {
        content.data = {};
    }

    if (!content.data._layerMigration) {
        content.data._layerMigration = {};
    }

    content.data._layerMigration = {
        ...migrationParams,
        ts: new Date().toISOString(),
    };

    return content;
};

export const getLayerMigrationData = (content: RepoNode<any>) =>
    content.data?._layerMigration as LayerMigration | null;
