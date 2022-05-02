import { CreateObjectTypeParams } from '/lib/graphql';
import graphQlLib from '/lib/guillotine/graphql';
import { ContextOptions, Context } from '/lib/guillotine';

export type CreationCallback = ContextOptions['creationCallbacks'][string];

type CreateObjectTypeParamsGuillotine = Pick<CreateObjectTypeParams, 'name' | 'fields'> &
    Partial<CreateObjectTypeParams>;

export const graphQlCreateObjectType = (
    context: Context,
    { name, fields, description, interfaces }: CreateObjectTypeParamsGuillotine
) => {
    return graphQlLib.createObjectType(context, { name, fields, description, interfaces });
};
