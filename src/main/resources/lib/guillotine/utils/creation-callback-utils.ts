import { CreateObjectTypeParams, GraphQLResolver, GraphQLType } from '/lib/graphql';
import graphQlLib from '/lib/guillotine/graphql';
import namingLib from '/lib/guillotine/util/naming';
import { ContextOptions, Context } from '/lib/guillotine';
import { CustomContentDescriptor } from '../../../types/content-types/content-config';

type CreationCallbackOriginal = ContextOptions['creationCallbacks'][string];
type ContextArgOriginal = Parameters<CreationCallbackOriginal>['0'];
type TypesOriginal = ContextArgOriginal['types'];

type ContextArg = Omit<ContextArgOriginal, 'types'> & {
    types: Record<string, GraphQLType> & TypesOriginal;
};
export type GraphQLParamsArg = Parameters<CreationCallbackOriginal>['1'];

// Define a new CreationCallback type which allows custom entries in the types record
export type CreationCallback = (
    context: ContextArg,
    params: GraphQLParamsArg
) => ReturnType<CreationCallbackOriginal>;

export type CreateObjectTypeParamsGuillotine<FieldKeys extends string = string> = Pick<
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

// Copy/paste from private function in Guillotine
export const createContentTypeName = (contentDescriptor: CustomContentDescriptor) => {
    const [applicationName, contentTypeLabel] = contentDescriptor.split(':');

    const appNameSegment = namingLib.sanitizeText(applicationName);
    const typeNameSegment = namingLib.generateCamelCase(contentTypeLabel, true);

    return `${appNameSegment}_${typeNameSegment}`;
};
