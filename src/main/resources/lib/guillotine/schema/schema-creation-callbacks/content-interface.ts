import { SchemaExtension } from '../../utils/creation-callback-utils';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { getPublicPath } from '../../../paths/public-path';

// Resolvers set on the Content interface are applied to all content types by the Guillotine app
export const contentInterfaceCallback: SchemaExtension = (graphQL, typeName) => ({
    resolvers: {
        [typeName]: {
            _path: (env) => {
                const locale = getLocaleFromContext();
                return getPublicPath(env.source, locale);
            },
        },
    },
});
