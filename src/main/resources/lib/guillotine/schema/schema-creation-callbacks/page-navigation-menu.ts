import contentLib, { Content } from '/lib/xp/content';
import nodeLib, { RepoConnection } from '/lib/xp/node';
import contextLib from '/lib/xp/context';
import graphQlLib from '/lib/graphql';
import { forceArray } from '../../../utils/nav-utils';
import { RepoBranch } from '../../../../types/common';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { NodeComponent } from '../../../../types/components/component-node';
import { logger } from '../../../utils/logging';

type AnchorLink = {
    anchorId: string;
    linkText?: string;
    hideFromInternalNavigation?: boolean;
};

const getComponents = (contentId: string, repo: RepoConnection) => {
    const content = contentLib.get({ key: contentId });
    if (!content) {
        return [];
    }

    const node = repo.get(content._id);

    return forceArray(node?.components);
};

const getAnchorLink = (
    anchorId?: string,
    linkText?: string,
    hideFromInternalNavigation?: boolean
) => {
    return anchorId
        ? {
              anchorId,
              linkText,
              hideFromInternalNavigation,
          }
        : null;
};

const getPartAnchorLink = (part: NodeComponent<'part'>['part']) => {
    const { descriptor, config } = part;

    if (!config) {
        return null;
    }

    if (descriptor === 'no.nav.navno:dynamic-header') {
        const dynamicHeader = config['no-nav-navno']?.['dynamic-header'];
        if (!dynamicHeader) {
            return null;
        }

        const { anchorId, title, hideFromInternalNavigation } = dynamicHeader;
        return getAnchorLink(anchorId, title, hideFromInternalNavigation);
    }

    return null;
};

const getLayoutAnchorLink = (layout: NodeComponent<'layout'>['layout']) => {
    const { descriptor, config } = layout;

    if (!config) {
        return null;
    }

    if (descriptor === 'no.nav.navno:situation-flex-cols') {
        const situationFlexCols = config['no-nav-navno']?.['situation-flex-cols'];
        if (!situationFlexCols) {
            return null;
        }

        const { anchorId, title, hideFromInternalNavigation } = situationFlexCols;
        return getAnchorLink(anchorId, title, hideFromInternalNavigation);
    }

    if (descriptor === 'no.nav.navno:section-with-header') {
        const sectionWithHeader = config['no-nav-navno']?.['section-with-header'];
        if (!sectionWithHeader) {
            return null;
        }

        const { anchorId, title, hideFromInternalNavigation } = sectionWithHeader;
        return getAnchorLink(anchorId, title, hideFromInternalNavigation);
    }

    return null;
};

const getFragmentAnchorLink = (
    fragment: NodeComponent<'fragment'>['fragment'],
    repo: RepoConnection
) => {
    const { id } = fragment;

    const content = repo.get<Content<'portal:fragment'>>({ key: id });

    if (!content) {
        return null;
    }

    const rootComponent = forceArray(content.components).find(
        (component) => component.path === '/'
    );

    if (!rootComponent) {
        return null;
    }

    return getComponentAnchorLink(rootComponent, repo);
};

const getComponentAnchorLink = (
    component: NodeComponent,
    repo: RepoConnection
): AnchorLink | null => {
    if (component.type === 'part') {
        return getPartAnchorLink(component.part);
    }

    if (component.type === 'layout') {
        return getLayoutAnchorLink(component.layout);
    }

    if (component.type === 'fragment') {
        return getFragmentAnchorLink(component.fragment, repo);
    }

    return null;
};

export const anchorLinksCallback: CreationCallback = (context, params) => {
    params.fields.isDupe = {
        type: graphQlLib.GraphQLBoolean,
    };
};

export const pageNavigationMenuCallback: CreationCallback = (context, params) => {
    params.fields.anchorLinks.args = { contentId: graphQlLib.GraphQLID };
    params.fields.anchorLinks.resolve = (env) => {
        const { contentId } = env.args;
        if (!contentId) {
            logger.error(
                'Attempted to resolve a page navigation menu without providing a content id for the page'
            );
            return null;
        }

        const context = contextLib.get();
        const repo = nodeLib.connect({
            repoId: context.repository,
            branch: context.branch as RepoBranch,
        });

        const anchorLinkOverrides = forceArray(env.source.anchorLinks);
        const components = getComponents(contentId, repo);

        const anchorLinksResolved = components.reduce((acc: AnchorLink[], component) => {
            const anchorLink = getComponentAnchorLink(component, repo);
            if (!anchorLink) {
                return acc;
            }

            const { anchorId, hideFromInternalNavigation } = anchorLink;

            if (hideFromInternalNavigation) {
                return acc;
            }

            const linkOverride = anchorLinkOverrides.find((link) => link.anchorId === anchorId);
            const isDupe = acc.some((_anchorLink) => _anchorLink.anchorId === anchorId);

            if (isDupe && context.branch === 'master') {
                logger.error(`Duplicate anchor id ${anchorId} found under content id ${contentId}`);
            }

            return [
                ...acc,
                {
                    ...anchorLink,
                    ...(linkOverride && { linkText: linkOverride.linkText }),
                    ...(isDupe && { isDupe }),
                },
            ];
        }, [] as AnchorLink[]);

        return anchorLinksResolved;
    };
};
