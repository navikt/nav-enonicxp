import * as portalLib from '/lib/xp/portal';
import { getRepoConnection } from '../utils/repo-utils';
import { NodeContent, RepoNode } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { NodeComponent } from '../../types/components/component-node';
import { runInContext } from '../context/run-in-context';
import { CONTENT_LOCALE_DEFAULT } from '../constants';
import { forceArray } from '../utils/array-utils';
import { applyModifiedData } from '../utils/content-utils';

type AreaPageNodeContent = NodeContent<Content<'no.nav.navno:area-page'>>;
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

const getSituationPages = (area: string, audience: string) =>
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
                            field: 'data.audience._selected',
                            values: [audience],
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

// TODO: this can be removed after we've migrated these pages to layers
const pageContainsLegacyLanguagesRef = (
    defaultSituationPage: SituationPageContent,
    localizedSituationPages: SituationPageContent[]
) => {
    return forceArray(defaultSituationPage.data.languages).some((languageVersionContentId) =>
        localizedSituationPages.some(
            (localizedContent) => localizedContent._id === languageVersionContentId
        )
    );
};

const getRelevantSituationPages = (areaPageNodeContent: AreaPageNodeContent) =>
    runInContext({ branch: 'master' }, () => {
        const { language, data } = areaPageNodeContent;
        const { area, audience } = data;

        const situationPages = getSituationPages(area, audience._selected);

        const situationPagesLocalized = situationPages.filter(
            (situationContent) => situationContent.language === language
        );

        if (language === CONTENT_LOCALE_DEFAULT) {
            return situationPagesLocalized;
        }

        // If there are any default-language (ie non-localized) pages in the current layer, include them as well
        const situationPagesFallback = situationPages.filter(
            (situationContent) =>
                situationContent.language === CONTENT_LOCALE_DEFAULT &&
                !pageContainsLegacyLanguagesRef(situationContent, situationPagesLocalized)
        );

        return [...situationPagesLocalized, ...situationPagesFallback];
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
const populateSituationsLayout = (req: XP.Request) => {
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
        logger.error(`No area specified for area page - ${content._id}`, true);
        return;
    }

    if (!content.data.audience?._selected) {
        logger.error(`No audience specified for area page - ${content._id}`, true);
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft' });

    const nodeContent = repo.get<AreaPageNodeContent>({ key: content._id });
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

const areaPageController = (req: XP.Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        populateSituationsLayout(req);
    }

    return frontendProxy(req);
};

export const get = areaPageController;
