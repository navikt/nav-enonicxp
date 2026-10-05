import * as contentLib from '/lib/xp/content';
import { SchemaExtension } from '../../utils/creation-callback-utils';
import { runInLocaleContext } from '../../../localization/locale-context';
import { getPublicPath } from '../../../paths/public-path';

export const macroLinkToLayerCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                href: { type: graphQL.GraphQLString },
            });
        },
    },
    resolvers: {
        [typeName]: {
            href: (env) => {
                const { locale, target, anchorId } = env.source;

                if (!target || !locale) {
                    return null;
                }

                const content = runInLocaleContext({ locale }, () =>
                    contentLib.get({ key: target })
                );
                if (!content) {
                    return null;
                }

                return `${getPublicPath(content, locale)}${anchorId ? `#${anchorId}` : ''}`;
            },
        },
    },
});
