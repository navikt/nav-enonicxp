import { RepoNode } from '/lib/xp/node';
import { LayerMigration } from '../../../site/x-data/layerMigration/layerMigration';
import { COMPONENT_APP_KEY } from '../../constants';
import { Content } from '/lib/xp/content';

type LayerMigrationParams = Omit<LayerMigration, 'ts'>;

export const insertLayerMigrationXData = ({
    content,
    migrationParams,
}: {
    content: RepoNode<any>;
    migrationParams: LayerMigrationParams;
}) => {
    content.x[COMPONENT_APP_KEY].layerMigration = {
        ...migrationParams,
        ts: new Date().toISOString(),
    };

    return content;
};

export const getLayerMigrationData = (content: RepoNode<Content>) =>
    content.x?.[COMPONENT_APP_KEY]?.layerMigration as LayerMigration | null;
