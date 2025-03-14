import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

export const animatedIconsCallback: CreationCallback = (context, params) => {
    const iconType = graphQlCreateObjectType(context, {
        name: 'AnimatedIcon',
        fields: {
            icon: {
                type: context.types.mediaType,
                resolve: (env) => {
                    const icon = env.source.icon;
                    if (!icon) {
                        return null;
                    }

                    return {
                        type: 'media:vector',
                        mediaUrl: icon._path,
                    };
                },
            },
        },
    });

    params.fields.icons = {
        type: graphQlLib.list(iconType),
        resolve: (env) => {
            const icons = env.source.icons;
            if (!Array.isArray(icons)) {
                return [];
            }

            return icons;
        },
    };
};
