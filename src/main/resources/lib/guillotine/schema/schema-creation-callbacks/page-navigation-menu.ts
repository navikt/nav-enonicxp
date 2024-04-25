import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../../../utils/repo-utils';
import { RepoConnection } from '/lib/xp/node';
import * as contextLib from '/lib/xp/context';
import graphQlLib from '/lib/graphql';
import { RepoBranch } from '../../../../types/common';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { NodeComponent } from '../../../../types/components/component-node';
import { logger } from '../../../utils/logging';
import { forceArray } from '../../../utils/array-utils';

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

    const node = repo.get<Content>(content._id);

    return forceArray(node?.components);
};

const getAnchorLink = (
    anchorId?: string,
    linkText?: string,
    hideFromInternalNavigation?: boolean
) => {
    return anchorId && linkText
        ? {
              anchorId,
              linkText,
              hideFromInternalNavigation,
          }
        : null;
};

const getLayoutAnchorLink = (layout: NodeComponent<'layout'>['layout']) => {
    if (!layout) {
        return null;
    }

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

    if (!id) {
        return null;
    }

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
        const repo = getRepoConnection({
            repoId: context.repository,
            branch: context.branch as RepoBranch,
        });

        const anchorLinkOverrides = forceArray(env.source.anchorLinks);
        const components = getComponents(contentId, repo);

        return components.reduce((acc: AnchorLink[], component) => {
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
                logger.warning(
                    `Duplicate anchor id ${anchorId} found under content id ${contentId}`,
                    false,
                    true
                );
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
    };
};
