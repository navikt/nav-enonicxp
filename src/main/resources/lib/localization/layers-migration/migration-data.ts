import { LayerMigration } from '../../../site/x-data/layerMigration/layerMigration';

type LayerMigrationParams = Omit<LayerMigration, 'ts'>;

export const generateLayerMigrationData = (params: LayerMigrationParams): LayerMigration => {
    return {
        ...params,
        ts: new Date().toISOString(),
    };
};
