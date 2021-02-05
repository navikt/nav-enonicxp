const graphQlLib = require('/lib/guillotine/graphql');
const contentLib = require('/lib/xp/content');

const portalFragmentCallback = (context, params) => {
    params.fields.fragment = {
        type: context.types.componentType,
        resolve: (env) => {
            const content = contentLib.get({ key: env.source._id });
            if (content?.fragment) {
                return content.fragment;
            }

            return null;
        },
    };
};

module.exports = { portalFragmentCallback };
