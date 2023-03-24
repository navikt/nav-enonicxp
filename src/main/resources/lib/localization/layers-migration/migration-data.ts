import { Content } from '/lib/xp/content';

type LayerMigrationData = {
    ts: string;
} & LayerMigrationParams;

export type NodeWithLayerMigrationData = Content & {
    layerMigration?: LayerMigrationData;
};

type LayerMigrationParams = {
    targetType: 'live' | 'archived';
    contentId: string;
    repoId: string;
    locale: string;
};

export const generateLayerMigrationData = (params: LayerMigrationParams): LayerMigrationData => {
    return {
        ...params,
        ts: new Date().toISOString(),
    };
};
