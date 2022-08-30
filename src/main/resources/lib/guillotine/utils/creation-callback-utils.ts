import { CreateObjectTypeParams, GraphQLResolver } from '/lib/graphql';
import graphQlLib from '/lib/guillotine/graphql';
import { ContextOptions, Context } from '/lib/guillotine';

export type CreationCallback = ContextOptions['creationCallbacks'][string];

type CreateObjectTypeParamsGuillotine<FieldKeys extends string> = Pick<
    CreateObjectTypeParams,
    'name'
> &
    Partial<CreateObjectTypeParams> & { fields: Record<FieldKeys, GraphQLResolver> };

export const graphQlCreateObjectType = <FieldKeys extends string = string>(
    context: Context,
    { name, fields, description, interfaces }: CreateObjectTypeParamsGuillotine<FieldKeys>
) => {
    return graphQlLib.createObjectType(context, { name, fields, description, interfaces });
};
