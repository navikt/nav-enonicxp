import portalLib from '/lib/xp/portal';
import nodeLib, { NodeContent, RepoNode } from '/lib/xp/node';
import contentLib, { Content } from '/lib/xp/content';
import { adminFrontendProxy } from './admin-frontend-proxy';
import { logger } from '../utils/logging';
import { AreaPage } from '../../site/content-types/area-page/area-page';
import { NodeComponent } from '../../types/components/component-node';

type AreaPageNodeContent = NodeContent<Content<'no.nav.navno:area-page'>>;
type AreaPageRepoNode = RepoNode<Content<'no.nav.navno:area-page'>>;
type SituationsLayoutComponent = NodeComponent<'layout', 'areapage-situations'>;

const getSituationLayout = (content: AreaPageNodeContent): SituationsLayoutComponent | null => {
    const situationLayouts = content.components.filter(
        (component) =>
            component.type === 'layout' &&
            component.layout.descriptor === 'no.nav.navno:areapage-situations'
    ) as SituationsLayoutComponent[];

    if (situationLayouts.length === 0) {
        return null;
    }

    if (situationLayouts.length > 1) {
        logger.warning(`Multiple situation-layouts found on area page - ${content._id}`);
    }

    return situationLayouts[0];
};

const getRelevantSituations = (area: AreaPage['area']) => {
    const situations = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:situation-page'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.area',
                        values: [area],
                    },
                },
            },
        },
    }).hits;

    logger.info(`Found ${situations.length} situations for ${area}`);

    return situations;
};

const buildSituationsLayout = (nodeContent: AreaPageNodeContent) => {
    const situationLayout = getSituationLayout(nodeContent);
    if (!situationLayout) {
        return null;
    }

    const situations = getRelevantSituations(nodeContent.data.area);

    return situationLayout;
};

const populateSituationLayout = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (content.type !== 'no.nav.navno:area-page') {
        logger.warning(`Invalid type for area page controller - ${content._id}`);
        return;
    }

    if (!content.data.area) {
        logger.warning(`No area specified for area page - ${content._id}`);
        return;
    }

    const repo = nodeLib.connect({ repoId: req.repositoryId, branch: 'draft' });
    const nodeContent = repo.get({ key: content._id });

    const situationLayout = buildSituationsLayout(nodeContent);
    if (!situationLayout) {
        return;
    }

    logger.info(JSON.stringify(nodeContent));
    logger.info(JSON.stringify(situationLayout));

    repo.modify({
        key: content._id,
        editor: (content: AreaPageRepoNode) => {
            const layout = content.components.find(
                (component) => component.path === situationLayout.path
            );

            return content;
        },
    });
};

const areaPageController = (req: XP.Request) => {
    if (req.mode === 'edit' && req.method === 'GET') {
        populateSituationLayout(req);
    }

    return adminFrontendProxy(req);
};

export const get = areaPageController;
