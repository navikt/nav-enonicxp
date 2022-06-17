import portalLib from '/lib/xp/portal';
import nodeLib, { NodeContent, RepoNode } from '/lib/xp/node';
import contentLib, { Content } from '/lib/xp/content';
import { adminFrontendProxy } from './admin-frontend-proxy';
import { logger } from '../utils/logging';
import { AreaPage } from '../../site/content-types/area-page/area-page';
import { NodeComponent } from '../../types/components/component-node';
import { runInBranchContext } from '../utils/branch-context';

type AreaPageNodeContent = NodeContent<Content<'no.nav.navno:area-page'>>;
type AreaPageRepoNode = RepoNode<Content<'no.nav.navno:area-page'>>;
type SituationsLayoutComponent = NodeComponent<'layout', 'areapage-situations'>;
type SituationPartComponent = NodeComponent<'part', 'areapage-situation-card'>;

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
    const situations = runInBranchContext(
        () =>
            contentLib.query({
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
            }).hits,
        'master'
    );

    logger.info(`Found ${situations.length} situations for ${area}`);

    return situations;
};

const buildPart = (
    path: string,
    target: string
): NodeComponent<'part', 'areapage-situation-card'> => {
    return {
        type: 'part',
        path,
        part: {
            descriptor: 'no.nav.navno:areapage-situation-card',
            config: {
                'no-nav-navno': {
                    'areapage-situation-card': {
                        disabled: false,
                        target,
                    },
                },
            },
        },
    };
};

const partHasSituationAsTarget = (
    component: SituationPartComponent,
    situation: Content<'no.nav.navno:situation-page'>
) =>
    component.part?.config?.['no-nav-navno']?.['areapage-situation-card']?.target === situation._id;

const componentIsValidSituationCard = (
    component: NodeComponent,
    situations: Content<'no.nav.navno:situation-page'>[]
): component is SituationPartComponent => {
    const isSituationCard =
        component.type === 'part' &&
        component.part.descriptor === 'no.nav.navno:areapage-situation-card';
    if (!isSituationCard) {
        return false;
    }

    return situations.some((situation) =>
        partHasSituationAsTarget(component as SituationPartComponent, situation)
    );
};

const buildNewPartsArray = (nodeContent: AreaPageNodeContent, pathPrefix: string) => {
    const situations = getRelevantSituations(nodeContent.data.area);

    const currentParts = nodeContent.components.filter((component) =>
        component.path.startsWith(pathPrefix)
    ) as SituationPartComponent[];

    const needsUpdate =
        situations.length !== currentParts.length ||
        !situations.every((situation) =>
            currentParts.some((part) => partHasSituationAsTarget(part, situation))
        );
    if (!needsUpdate) {
        logger.info(
            `${nodeContent._id} already has every relevant situation part, skipping update`
        );
        return null;
    }

    const currentValidParts = currentParts.filter((component) =>
        componentIsValidSituationCard(component, situations)
    );

    logger.info(`Found ${currentValidParts.length} valid existing parts`);
    const missingSituations = situations.filter(
        (situation) => !currentValidParts.some((part) => partHasSituationAsTarget(part, situation))
    );

    const numCurrentParts = currentValidParts.length;
    const newParts = missingSituations.map((situation, index) =>
        buildPart(`${pathPrefix}/${index + numCurrentParts}`, situation._id)
    );
    logger.info(`Creating ${newParts.length} new parts`);

    return [...currentValidParts, ...newParts];
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
    if (!nodeContent?.components) {
        return null;
    }

    const situationLayout = getSituationLayout(nodeContent);
    if (!situationLayout) {
        return null;
    }

    const pathPrefix = `${situationLayout.path}/situations`;

    const situationParts = buildNewPartsArray(nodeContent, pathPrefix);
    if (!situationParts) {
        return;
    }

    repo.modify({
        key: content._id,
        editor: (content: AreaPageRepoNode) => {
            const otherComponents = content.components.filter(
                (component) => !component.path.startsWith(pathPrefix)
            );

            const components = [...otherComponents, ...situationParts];

            logger.info(`Components! ${JSON.stringify(components)}`);

            return { ...content, components };
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
