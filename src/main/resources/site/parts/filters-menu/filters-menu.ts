import { Content } from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import { getRepoConnection } from '../../../lib/utils/repo-connection';
import { NodeContent } from '/lib/xp/node';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';
import { generateUUID, isUUID } from '../../../lib/utils/uuid';
import { getComponentConfigByPath } from '../../../lib/utils/component-utils';
import { forceArray } from '../../../lib/utils/array-utils';

const insertIdIfNotExist = (component: any) => {
    if (!isUUID(component.id)) {
        component.id = generateUUID();
    }
};

const generatePersistantIds = (componentPath: string) => (content: NodeContent<Content>) => {
    const { components } = content;

    const config = getComponentConfigByPath(componentPath, components);

    if (!config) {
        return content;
    }

    const categories = forceArray(config.categories);

    categories.forEach((category) => {
        insertIdIfNotExist(category);
        forceArray(category.filters)?.forEach((filter) => insertIdIfNotExist(filter));
    });

    return content;
};

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        const contentId = portalLib.getContent()._id;
        const component = portalLib.getComponent();

        const repo = getRepoConnection({
            repoId: req.repositoryId,
            branch: req.branch,
        });

        repo.modify<any>({
            key: contentId,
            editor: generatePersistantIds(component.path),
        });
    }

    return componentPreviewController(req);
};
