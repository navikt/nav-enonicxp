import graphQlLib, { GraphQLResolverEnvironment } from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { getPublicPath } from '../../../paths/public-path';
import { logger } from '../../../utils/logging';
import { getRepoConnection } from '../../../utils/repo-utils';
import { Content } from '/lib/xp/content';
import { forceArray } from '../../../utils/array-utils';

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const locale = getLocaleFromContext();
        return getPublicPath(env.source, locale);
    };

    params.fields.components.args = {
        ...params.fields.components.args,
        path: graphQlLib.GraphQLString,
    };

    const componentsResolveOriginal =
        params.fields.components.resolve || ((_: GraphQLResolverEnvironment) => null);

    params.fields.components.resolve = (env) => {
        const { path } = env.args;
        if (!path) {
            return componentsResolveOriginal(env);
        }

        const { _id } = env.source;
        const { repository, branch } = contextLib.get();

        const contentNode = getRepoConnection({ repoId: repository, branch }).get<Content>(_id);
        if (!contentNode) {
            return null;
        }

        const { components } = contentNode;

        const componentWithChildren = forceArray(components).filter((c) => c.path.startsWith(path));
        if (componentWithChildren.length === 0) {
            logger.warning(
                `Invalid component path ${path} on content ${_id}[${repository}][${branch}] - no components found`
            );
            return null;
        }

        return componentWithChildren;
    };
};
