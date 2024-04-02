import * as portalLib from '/lib/xp/portal';
import { getRepoConnection } from '../../../lib/utils/repo-utils';
import { componentPreviewController } from '../../../lib/controllers/component-preview-controller';
import { generateUUID, isUUID } from '../../../lib/utils/uuid';
import { getComponentConfigByPath } from '../../../lib/utils/component-utils';
import { forceArray } from '../../../lib/utils/array-utils';
import { ContentNode } from '../../../types/content-types/content-config';
import { Content } from '/lib/xp/portal';

const insertIdIfNotExist = (component: any) => {
    if (!isUUID(component.id)) {
        component.id = generateUUID();
    }
};

const generatePersistantIds = (componentPath: string, content: ContentNode) => {
    const { components } = content;

    const config = getComponentConfigByPath(componentPath, components);

    if (!config) {
        return;
    }

    const categories = forceArray(config.categories);

    categories.forEach((category) => {
        insertIdIfNotExist(category);
        forceArray(category.filters)?.forEach((filter) => insertIdIfNotExist(filter));
    });
};

const injectPersistantIds = (req: XP.Request) => {
    const contentId = portalLib.getContent()?._id;
    const component = portalLib.getComponent();

    if (!contentId || !component) {
        return;
    }

    const repo = getRepoConnection({
        repoId: req.repositoryId,
        branch: req.branch,
    });

    repo.modify<Content>({
        key: contentId,
        editor: (content) => {
            generatePersistantIds(component.path, content);
            return content;
        },
    });
};

export const get = (req: XP.Request) => {
    if (req.mode === 'edit') {
        injectPersistantIds(req);
    }

    return componentPreviewController(req);
};
