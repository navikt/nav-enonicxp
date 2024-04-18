import graphQlLib from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { getPublicPath } from '../../../paths/public-path';
import { logger } from '../../../utils/logging';
import { getRepoConnection } from '../../../utils/repo-utils';
import { Content } from '/lib/xp/content';
import { forceArray } from '../../../utils/array-utils';

const componentsResolveForPath = (contentId: string, componentPath: string) => {
    const { repository, branch } = contextLib.get();

    const contentNode = getRepoConnection({ repoId: repository, branch }).get<Content>(contentId);
    if (!contentNode) {
        return null;
    }

    const componentsForPath = forceArray(contentNode.components).filter((component) =>
        component.path.startsWith(componentPath)
    );

    if (componentsForPath.length === 0) {
        logger.warning(
            `Invalid component path ${componentPath} on content ${contentId}[${repository}][${branch}] - no components found`
        );
        return null;
    }

    return componentsForPath;
};

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const locale = getLocaleFromContext();
        return getPublicPath(env.source, locale);
    };

    params.fields.components.args = {
        ...params.fields.components.args,
        path: graphQlLib.GraphQLString,
    };

    const componentsResolveOriginal = params.fields.components.resolve!;

    params.fields.components.resolve = (env) => {
        const { path } = env.args;
        return path
            ? componentsResolveForPath(env.source._id, path)
            : componentsResolveOriginal(env);
    };
};
