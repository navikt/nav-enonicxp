import graphQlLib from '/lib/graphql';
import * as contentLib from '/lib/xp/content';
import { CreationCallback, graphQlCreateObjectType } from '../../../utils/creation-callback-utils';
import { forceArray } from '../../../../utils/array-utils';

export const alternativeAudienceCallback =
    (contentTypePrefix: string): CreationCallback =>
    (context, params) => {
        const providerAudience = graphQlCreateObjectType(context, {
            name: `${contentTypePrefix}ProviderAudience`,
            fields: {
                name: { type: graphQlLib.GraphQLString },
                overrideLabel: { type: graphQlLib.GraphQLString },
            },
        });
        const audienceSelection = graphQlCreateObjectType(context, {
            name: `${contentTypePrefix}PersonType`,
            fields: {
                providerAudience: { type: graphQlLib.list(providerAudience) },
                targetPage: { type: graphQlLib.reference('Content') },
            },
        });
        const providerList = graphQlCreateObjectType(context, {
            name: `${contentTypePrefix}ProviderList`,
            fields: {
                providerList: { type: graphQlLib.list(audienceSelection) },
            },
        });

        const resolver = (env: graphQlLib.GraphQLResolverEnvironment, key: string) => {
            if (key === 'provider') {
                const providerList = forceArray(env.source[key]?.providerList);

                const resolvedList = providerList.map((provider) => {
                    const providerAudience = forceArray(provider.subProviders).map(
                        (subProvider) => {
                            const overrideLabel =
                                subProvider._selected === 'other'
                                    ? subProvider.other.overrideLabel
                                    : null;
                            return {
                                name: subProvider._selected,
                                overrideLabel,
                            };
                        }
                    );
                    return {
                        providerAudience,
                        targetPage: provider.targetPage
                            ? contentLib.get({ key: provider.targetPage })
                            : null,
                    };
                });

                return { providerList: resolvedList };
            }
            const contentId = env.source[key]?.targetPage;
            const targetPage = contentId ? contentLib.get({ key: contentId }) : null;
            return { targetPage };
        };

        params.fields._selected.type = graphQlLib.GraphQLString;
        params.fields.person = {
            type: audienceSelection,
            resolve: (env) => resolver(env, 'person'),
        };
        params.fields.employer = {
            type: audienceSelection,
            resolve: (env) => resolver(env, 'employer'),
        };
        params.fields.provider = {
            type: providerList,
            resolve: (env) => resolver(env, 'provider'),
        };
    };

export const audienceCallback: CreationCallback = (context, params) => {
    params.fields._selected.type = graphQlLib.GraphQLString;
};
