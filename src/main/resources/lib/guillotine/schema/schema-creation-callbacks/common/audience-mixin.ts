import * as contentLib from '/lib/xp/content';
import {
    ObjectTypeDefinition,
    ResolverEnv,
    SchemaExtension,
} from '../../../utils/creation-callback-utils';
import { forceArray } from '../../../../utils/array-utils';

const resolveAudience = (env: ResolverEnv, key: 'person' | 'employer' | 'provider') => {
    if (key === 'provider') {
        const providerList = forceArray(env.source[key]?.providerList);

        const resolvedList = providerList.map((provider) => {
            const providerAudience = forceArray(provider.subProviders).map((subProvider) => {
                const overrideLabel =
                    subProvider._selected === 'other' ? subProvider.other.overrideLabel : null;
                return {
                    name: subProvider._selected,
                    overrideLabel,
                };
            });
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

export const alternativeAudienceCallback =
    (contentTypePrefix: string): SchemaExtension =>
    (graphQL, typeName) => {
        const providerAudienceTypeName = `${contentTypePrefix}ProviderAudience`;
        const audienceSelectionTypeName = `${contentTypePrefix}PersonType`;
        const providerListTypeName = `${contentTypePrefix}ProviderList`;

        return {
            types: {
                [providerAudienceTypeName]: <ObjectTypeDefinition>{
                    fields: {
                        name: { type: graphQL.GraphQLString },
                        overrideLabel: { type: graphQL.GraphQLString },
                    },
                },
                [audienceSelectionTypeName]: <ObjectTypeDefinition>{
                    fields: {
                        providerAudience: {
                            type: graphQL.list(graphQL.reference(providerAudienceTypeName)),
                        },
                        targetPage: { type: graphQL.reference('Content') },
                    },
                },
                [providerListTypeName]: <ObjectTypeDefinition>{
                    fields: {
                        providerList: {
                            type: graphQL.list(graphQL.reference(audienceSelectionTypeName)),
                        },
                    },
                },
            },
            creationCallbacks: {
                [typeName]: (params) => {
                    params.addFields({
                        _selected: { type: graphQL.GraphQLString },
                        person: { type: graphQL.reference(audienceSelectionTypeName) },
                        employer: { type: graphQL.reference(audienceSelectionTypeName) },
                        provider: { type: graphQL.reference(providerListTypeName) },
                    });
                },
            },
            resolvers: {
                [typeName]: {
                    person: (env) => resolveAudience(env, 'person'),
                    employer: (env) => resolveAudience(env, 'employer'),
                    provider: (env) => resolveAudience(env, 'provider'),
                },
            },
        };
    };

export const audienceCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                _selected: { type: graphQL.GraphQLString },
            });
        },
    },
});
