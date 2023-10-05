import * as contentLib from '/lib/xp/content';
import { CreationCallback } from '../../utils/creation-callback-utils';
import graphQlLib from '/lib/graphql';
import { runInLocaleContext } from '../../../localization/locale-context';
import { getPublicPath } from '../../../paths/public-path';

export const macroLinkToLayerCallback: CreationCallback = (context, params) => {
    params.fields.href = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            const { locale, target, anchorId } = env.source;

            if (!target || !locale) {
                return null;
            }

            const content = runInLocaleContext({ locale }, () => contentLib.get({ key: target }));
            if (!content) {
                return null;
            }

            return `${getPublicPath(content, locale)}${anchorId ? `#${anchorId}` : ''}`;
        },
    };
};
