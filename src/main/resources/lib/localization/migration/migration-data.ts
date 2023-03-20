import { Content } from '/lib/xp/content';

type LayerMigrationDataLive = {
    type: 'live';
    archivedContentId: string;
    archivedRepoId: string;
    archivedLocale: string;
};

type LayerMigrationDataArchived = {
    type: 'archived';
    liveContentId: string;
    liveRepoId: string;
    liveLocale: string;
};

type LayerMigrationData = {
    ts: string;
} & LayerMigrationParams;

export type NodeWithLayerMigrationData = Content & {
    layerMigration?: LayerMigrationData;
};

type LayerMigrationParams = LayerMigrationDataLive | LayerMigrationDataArchived;

export const generateLayerMigrationData = (params: LayerMigrationParams): LayerMigrationData => {
    return {
        ...params,
        ts: new Date().toISOString(),
    };
};
