import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { getPublicPath } from '../../../paths/public-path';

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const locale = getLocaleFromContext();
        return getPublicPath(env.source, locale);
    };
    params.fields.alerts = {
        type: graphQlLib.list(graphQlLib.reference('no_nav_navno_AlertInContext')),
    };
};
