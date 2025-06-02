import { Request } from '@enonic-types/core'
import * as portalLib from '/lib/xp/portal';
import { getRepoConnection } from '../repos/repo-utils';
import { RepoNode } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { NodeComponent } from 'types/components/component-node';
import { runInContext } from '../context/run-in-context';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { applyModifiedData } from '../utils/content-utils';
import { frontendProxy } from './frontend-proxy';

type AreaPageContent = Content<'no.nav.navno:area-page'>;
type AreaPageRepoNode = RepoNode<Content<'no.nav.navno:area-page'>>;
type SituationPageContent = Content<'no.nav.navno:situation-page'>;
type SituationsLayoutComponent = NodeComponent<'layout', 'areapage-situations'>;
type SituationCardPartComponent = NodeComponent<'part', 'areapage-situation-card'>;

const getSituationsLayout = (
    components: NodeComponent[],
    contentId: string
): SituationsLayoutComponent | null => {
    const situationsLayouts = components.filter(
        (component): component is SituationsLayoutComponent =>
            component.type === 'layout' &&
            component.layout.descriptor === 'no.nav.navno:areapage-situations'
    );

    if (situationsLayouts.length === 0) {
        return null;
    }

    if (situationsLayouts.length > 1) {
        logger.error(`Multiple situations-layouts found on area page - ${contentId}`);
    }

    return situationsLayouts[0];
};

const getRelevantSituationPages = (areaPageNodeContent: AreaPageContent) =>
    runInContext({ branch: 'master' }, () => {
        const { area, audience } = areaPageNodeContent.data;
        const selectedAudience = audience?._selected;

        if (!selectedAudience) {
            return [];
        }

        return contentLib.query({
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
                                field: 'data.audience._selected',
                                values: [selectedAudience],
                            },
                        },
                    ],
                    mustNot: [
                        {
                            hasValue: {
                                field: 'x.no-nav-navno.previewOnly.previewOnly',
                                values: [true],
                            },
                        },
                    ],
                },
            },
        }).hits;
    });

const buildSituationCardPart = (path: string, target: string): SituationCardPartComponent => ({
    type: 'part',
    path,
    part: {
        descriptor: 'no.nav.navno:areapage-situation-card',
        config: {
            'no-nav-navno': {
                'areapage-situation-card': {
                    dummyTarget: target,
                    disabled: false,
                    target,
                },
            },
        },
    },
});

const situationCardHasTarget = (
    situationCard: SituationCardPartComponent,
    situationPageTarget: SituationPageContent
) => {
    const config = situationCard.part?.config?.['no-nav-navno']?.['areapage-situation-card'];

    if (!config) {
        return false;
    }

    return (
        config.target === situationPageTarget._id && config.dummyTarget === situationPageTarget._id
    );
};

const componentIsSituationCard = (
    component: NodeComponent
): component is SituationCardPartComponent =>
    component.type === 'part' &&
    component.part.descriptor === 'no.nav.navno:areapage-situation-card';

// Builds a new components array for the situations layout
// We want the layout to contain one situation card part for every relevant
// situation, and nothing else
const buildSituationCardArray = (
    situations: SituationPageContent[],
    components: NodeComponent[],
    regionPath: string
): SituationCardPartComponent[] => {
    // Filter out any unwanted components from the region, and reindex the component paths
    // to ensure no gaps exists in the index
    const currentValidParts = components
        .filter(
            (component): component is SituationCardPartComponent =>
                componentIsSituationCard(component) &&
                situations.some((situation) => situationCardHasTarget(component, situation))
        )
        .map((component, index) => ({ ...component, path: `${regionPath}/${index}` }));

    const missingSituations = situations.filter(
        (situation) => !currentValidParts.some((part) => situationCardHasTarget(part, situation))
    );

    // Create new parts for any missing situations
    const numCurrentParts = currentValidParts.length;
    const newParts = missingSituations.map((situation, index) =>
        buildSituationCardPart(`${regionPath}/${index + numCurrentParts}`, situation._id)
    );

    return [...currentValidParts, ...newParts];
};

const validateRegionComponents = (
    components: NodeComponent[],
    situations: SituationPageContent[]
) =>
    situations.length === components.length &&
    situations.every((situation) =>
        components.some(
            (component) =>
                componentIsSituationCard(component) && situationCardHasTarget(component, situation)
        )
    );

// If an areapage-situations layout is present on the page, populate
// it with situation cards appropriate for the page.
const populateSituationsLayout = (req: Request) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Could not get contextual content from request - path: ${req.rawPath}`);
        return;
    }
    if (content.type !== 'no.nav.navno:area-page') {
        logger.error(`Invalid type for area page controller - ${content._id}`);
        return;
    }
    if (!content.data.area) {
        logger.error(`No area specified for area page - ${content._id}`, true);
        return;
    }
    if (!content.data.audience?._selected) {
        logger.error(`No audience specified for area page - ${content._id}`, true);
        return;
    }
    if (!req.repositoryId) {
        logger.error(`No repoId for area page - ${content._id}`);
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft' });
    const nodeContent = repo.get<AreaPageContent>({ key: content._id });
    if (!nodeContent?.components) {
        return;
    }
    const components = forceArray(nodeContent.components);

    // If no areapage-situations layout exists on the page, there is nothing to populate
    const situationLayout = getSituationsLayout(components, nodeContent._id);
    if (!situationLayout) {
        return;
    }

    const relevantSituationPages = getRelevantSituationPages(nodeContent);
    const situationsRegionPath = `${situationLayout.path}/situations`;
    const situationsRegionComponents = components.filter((component) =>
        component.path.startsWith(situationsRegionPath)
    );

    // If the region already has the correct components, we don't have to do anything
    if (validateRegionComponents(situationsRegionComponents, relevantSituationPages)) {
        return;
    }

    const situationCards = buildSituationCardArray(
        relevantSituationPages,
        components,
        situationsRegionPath
    );

    repo.modify({
        key: nodeContent._id,
        editor: (content: AreaPageRepoNode) => {
            const otherComponents = forceArray(content.components).filter(
                (component) => !component.path.startsWith(situationsRegionPath)
            );

            return {
                ...applyModifiedData(content),
                components: [...otherComponents, ...situationCards],
            };
        },
    });
};

const areaPageController = (req: Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        populateSituationsLayout(req);
    }

    return frontendProxy(req);
};

export const get = areaPageController;
