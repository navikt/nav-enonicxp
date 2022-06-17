import portalLib from '/lib/xp/portal';
import nodeLib, { NodeContent, RepoNode } from '/lib/xp/node';
import contentLib, { Content } from '/lib/xp/content';
import { adminFrontendProxy } from './admin-frontend-proxy';
import { logger } from '../utils/logging';
import { NodeComponent } from '../../types/components/component-node';
import { runInBranchContext } from '../utils/branch-context';
import { contentRepo } from '../constants';
import { forceArray } from '../utils/nav-utils';

type AreaPageNodeContent = NodeContent<Content<'no.nav.navno:area-page'>>;
type AreaPageRepoNode = RepoNode<Content<'no.nav.navno:area-page'>>;
type SituationPageContent = Content<'no.nav.navno:situation-page'>;
type SituationsLayoutComponent = NodeComponent<'layout', 'areapage-situations'>;
type SituationCardPartComponent = NodeComponent<'part', 'areapage-situation-card'>;

const getSituationLayout = (
    components: NodeComponent[],
    contentId: string
): SituationsLayoutComponent | null => {
    const situationLayouts = components.filter(
        (component) =>
            component.type === 'layout' &&
            component.layout.descriptor === 'no.nav.navno:areapage-situations'
    ) as SituationsLayoutComponent[];

    if (situationLayouts.length === 0) {
        return null;
    }

    if (situationLayouts.length > 1) {
        logger.error(`Multiple situation-layouts found on area page - ${contentId}`);
    }

    return situationLayouts[0];
};

const getRelevantSituations = (content: AreaPageNodeContent) => {
    const { area, audience } = content.data;

    const situations = runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 1000,
                contentTypes: ['no.nav.navno:situation-page'],
                filters: {
                    boolean: {
                        must: [
                            {
                                hasValue: {
                                    field: 'data.area',
                                    values: [area],
                                },
                            },
                            {
                                hasValue: {
                                    field: 'data.audience',
                                    values: [audience],
                                },
                            },
                        ],
                    },
                },
            }).hits,
        'master'
    );

    logger.info(`Found ${situations.length} situations for ${area} ${audience}`);

    return situations;
};

const buildSituationCardPart = (path: string, target: string): SituationCardPartComponent => ({
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
});

const partHasSituationAsTarget = (
    component: SituationCardPartComponent,
    situation: SituationPageContent
) =>
    component.part?.config?.['no-nav-navno']?.['areapage-situation-card']?.target === situation._id;

const componentIsValidSituationCard = (
    component: NodeComponent,
    situations: SituationPageContent[]
): component is SituationCardPartComponent => {
    const isSituationCard =
        component.type === 'part' &&
        component.part.descriptor === 'no.nav.navno:areapage-situation-card';
    if (!isSituationCard) {
        return false;
    }

    return situations.some((situation) =>
        partHasSituationAsTarget(component as SituationCardPartComponent, situation)
    );
};

// Builds a new parts array for the situations layout
// We want the layout to contains one situation card part for every relevant
// situation, and nothing else
const buildNewPartsArray = (
    situations: SituationPageContent[],
    components: NodeComponent[],
    regionPath: string
) => {
    const currentParts = components.filter((component) => component.path.startsWith(regionPath));

    // If the region already has the right parts, we don't have to do anything
    const regionHasCorrectParts =
        situations.length === currentParts.length &&
        situations.every((situation) =>
            currentParts.some(
                (part) =>
                    part.type === 'part' &&
                    part.part.descriptor === 'no.nav.navno:areapage-situation-card' &&
                    partHasSituationAsTarget(part as SituationCardPartComponent, situation)
            )
        );
    if (regionHasCorrectParts) {
        return null;
    }

    // Filter out any unwanted parts in the region, and reindex the component paths
    // to ensure no gaps exists in the index
    const currentValidParts = currentParts
        .filter((component) => componentIsValidSituationCard(component, situations))
        .map((component, index) => ({ ...component, path: `${regionPath}/${index}` }));

    logger.info(`Found ${currentValidParts.length} valid existing parts`);

    const missingSituations = situations.filter(
        (situation) =>
            !currentValidParts.some((part) =>
                partHasSituationAsTarget(part as SituationCardPartComponent, situation)
            )
    );

    // Create new parts for any missing situations
    const numCurrentParts = currentValidParts.length;
    const newParts = missingSituations.map((situation, index) =>
        buildSituationCardPart(`${regionPath}/${index + numCurrentParts}`, situation._id)
    );

    logger.info(`Creating ${newParts.length} new parts`);

    return [...currentValidParts, ...newParts];
};

// If an areapage-situations layout is present on the page, populate
// it with situation cards appropriate for the page.
const populateSituationLayout = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Could not get contextual content from request path - ${req.rawPath}`);
        return;
    }

    if (content.type !== 'no.nav.navno:area-page') {
        logger.error(`Invalid type for area page controller - ${content._id}`);
        return;
    }

    if (!content.data.area) {
        logger.warning(`No area specified for area page - ${content._id}`);
        return;
    }

    if (!content.data.audience) {
        logger.warning(`No audience specified for area page - ${content._id}`);
        return;
    }

    const repo = nodeLib.connect({ repoId: contentRepo, branch: 'draft' });

    const nodeContent = repo.get({ key: content._id });
    if (!nodeContent?.components) {
        return;
    }

    const components = forceArray(nodeContent.components);

    const situationLayout = getSituationLayout(components, nodeContent._id);
    if (!situationLayout) {
        return;
    }

    const situationsRegionPath = `${situationLayout.path}/situations`;
    const situations = getRelevantSituations(nodeContent);

    const situationParts = buildNewPartsArray(situations, components, situationsRegionPath);
    if (!situationParts) {
        return;
    }

    repo.modify({
        key: nodeContent._id,
        editor: (content: AreaPageRepoNode) => {
            const otherComponents = forceArray(content.components).filter(
                (component) => !component.path.startsWith(situationsRegionPath)
            );

            return {
                ...content,
                components: [...otherComponents, ...situationParts],
            };
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
