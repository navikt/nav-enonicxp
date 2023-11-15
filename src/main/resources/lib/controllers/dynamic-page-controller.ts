import * as portalLib from '/lib/xp/portal';
import { NodeContent, RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { frontendProxy } from './frontend-proxy';
import { CONTENT_ROOT_REPO_ID } from '../constants';

import { removeInvalidFilterIds } from './dynamic-page-controller-helpers/filter-cleaner';
import { synchronizeMetaDataToLayers } from './dynamic-page-controller-helpers/meta-synchronzation';

type DynamicPageContent = NodeContent<Content>;
type DynamicContentRepoNode = RepoNode<Content>;

const dynamicPageController = (req: XP.Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        removeInvalidFilterIds(req);
        synchronizeMetaDataToLayers(req);
    }

    return frontendProxy(req);
};

export const get = dynamicPageController;
