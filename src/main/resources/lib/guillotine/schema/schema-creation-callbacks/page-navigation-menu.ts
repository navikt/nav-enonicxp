import contentLib, { Content } from '/lib/xp/content';
import nodeLib from '/lib/xp/node';
import contextLib from '/lib/xp/context';
import graphQlLib from '/lib/graphql';
import { forceArray } from '../../../utils/nav-utils';
import { RepoBranch } from '../../../../types/common';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { NodeComponent } from '../../../../types/components/component-node';

type AnchorLink = {
    anchorId: string;
    linkText?: string;
    hideFromInternalNavigation?: boolean;
};

const getComponentsOnPage = (contentId: string) => {
    const content = contentLib.get({ key: contentId });
    if (!content) {
        return [];
    }

    const context = contextLib.get();

    const node = nodeLib
        .connect({
            repoId: context.repository,
            branch: context.branch as RepoBranch,
        })
        .get(content?._id);

    return forceArray(node?.components);
};

const getComponentAnchorLink = (
    component: NodeComponent | Content<'portal:fragment'>
): AnchorLink | null => {
    if (component.type === 'part') {
        if (component.part.descriptor !== 'no.nav.navno:dynamic-header') {
            return null;
        }

        const dynamicHeader = component.part.config?.['no-nav-navno']?.['dynamic-header'];
        if (!dynamicHeader) {
            return null;
        }

        const { anchorId, title, hideFromInternalNavigation } = dynamicHeader;
        return anchorId
            ? {
                  anchorId,
                  linkText: title,
                  hideFromInternalNavigation,
              }
            : null;
    }

    if (component.type === 'layout') {
        if (component.layout.descriptor === 'no.nav.navno:situation-flex-cols') {
            const situationFlexCols =
                component.layout.config?.['no-nav-navno']?.['situation-flex-cols'];

            if (!situationFlexCols) {
                return null;
            }

            const { anchorId, title, hideFromInternalNavigation } = situationFlexCols;

            return anchorId
                ? {
                      anchorId,
                      linkText: title,
                      hideFromInternalNavigation,
                  }
                : null;
        }

        if (component.layout.descriptor === 'no.nav.navno:section-with-header') {
            const sectionWithHeader =
                component.layout?.config?.['no-nav-navno']?.['section-with-header'];

            if (!sectionWithHeader) {
                return null;
            }

            const { anchorId, title, hideFromInternalNavigation } = sectionWithHeader;
            return anchorId
                ? {
                      anchorId,
                      linkText: title,
                      hideFromInternalNavigation,
                  }
                : null;
        }
    }

    if (component.type === 'portal:fragment') {
        if (
            component.fragment.type === 'layout' &&
            component.fragment.descriptor === 'no.nav.navno:section-with-header'
        ) {
            const fragmentSectionWithHeader = component.fragment.config;
            if (fragmentSectionWithHeader) {
                const { anchorId, title, hideFromInternalNavigation } = fragmentSectionWithHeader;
                return anchorId
                    ? {
                          anchorId,
                          linkText: title,
                          hideFromInternalNavigation,
                      }
                    : null;
            }
        }

        return null;
    }

    return null;
};

export const pageNavigationMenuCallback: CreationCallback = (context, params) => {
    params.fields.anchorLinks.args = { contentId: graphQlLib.GraphQLID };
    params.fields.anchorLinks.resolve = (env) => {
        const { contentId } = env.args;
        if (!contentId) {
            log.warning(
                'Attempted to resolve a page navigation menu without providing a content id for the page'
            );
            return null;
        }

        const anchorLinkOverrides = forceArray(env.source.anchorLinks);
        const components = getComponentsOnPage(contentId);

        const anchorLinksResolved = components.reduce((acc: AnchorLink[], component) => {
            let anchorLink;
            if (component.type === 'fragment') {
                const { id } = component.fragment;
                const fragmentContent = contentLib.get({ key: id });

                if (fragmentContent?.type === 'portal:fragment') {
                    anchorLink = fragmentContent && getComponentAnchorLink(fragmentContent);
                }
            } else {
                anchorLink = getComponentAnchorLink(component);
            }

            if (!anchorLink) {
                return acc;
            }

            const { anchorId, hideFromInternalNavigation } = anchorLink;

            if (hideFromInternalNavigation) {
                return acc;
            }

            if (acc.find((_anchorLink) => _anchorLink.anchorId === anchorId)) {
                log.warning(`Duplicate anchor id ${anchorId} found under content id ${contentId}`);
                return acc;
            }

            const linkOverride = anchorLinkOverrides.find((link) => link.anchorId === anchorId);

            return [
                ...acc,
                {
                    ...anchorLink,
                    ...(linkOverride && { linkText: linkOverride.linkText }),
                },
            ];
        }, [] as AnchorLink[]);

        return anchorLinksResolved;
    };
};
