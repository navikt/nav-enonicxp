// Types and helpers for the Guillotine app 8 schema extensions API. Extensions are loaded by the
// Guillotine app from /guillotine/guillotine.ts in our app.
// See https://developer.enonic.com/docs/guillotine/stable/extending

// Opaque reference to a GraphQL type object created by the Guillotine app
export type GraphQLType = unknown;

export type GuillotineGraphQL = {
    GraphQLString: GraphQLType;
    GraphQLInt: GraphQLType;
    GraphQLID: GraphQLType;
    GraphQLBoolean: GraphQLType;
    GraphQLFloat: GraphQLType;
    Json: GraphQLType;
    DateTime: GraphQLType;
    Date: GraphQLType;
    LocalTime: GraphQLType;
    LocalDateTime: GraphQLType;
    list: (type: GraphQLType) => GraphQLType;
    nonNull: (type: GraphQLType) => GraphQLType;
    reference: (typeName: string) => GraphQLType;
    createDataFetcherResult: (params: {
        data: unknown;
        localContext?: Record<string, unknown>;
        parentLocalContext?: Record<string, unknown>;
    }) => unknown;
};

export type FieldDefinition = {
    type: GraphQLType;
    args?: Record<string, GraphQLType>;
    description?: string;
};

export type ObjectTypeDefinition<FieldKeys extends string = string> = {
    description?: string;
    interfaces?: GraphQLType[];
    fields: Record<FieldKeys, FieldDefinition>;
};

export type CreationCallbackParams = {
    // Adds new fields, or replaces existing fields completely (including args)
    addFields: (fields: Record<string, FieldDefinition>) => void;
    // Modifies the type and/or args of existing fields
    modifyFields: (fields: Record<string, Partial<FieldDefinition>>) => void;
    removeFields: (fieldNames: string[]) => void;
    setDescription: (description: string) => void;
    setInterfaces: (interfaces: GraphQLType[]) => void;
};

export type CreationCallback = (params: CreationCallbackParams) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolverEnv<Source = any, Args = any> = {
    source: Source;
    args: Args;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localContext: Record<string, any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldResolver<Source = any, Args = any> = (env: ResolverEnv<Source, Args>) => unknown;

export type GuillotineExtensions = {
    types?: Record<string, ObjectTypeDefinition>;
    creationCallbacks?: Record<string, CreationCallback>;
    resolvers?: Record<string, Record<string, FieldResolver>>;
};

// Extension for a single existing type in the Guillotine schema. The name of the type is provided,
// as some extensions are shared between multiple types.
export type SchemaExtension = (
    graphQL: GuillotineGraphQL,
    typeName: string
) => GuillotineExtensions;

// Content objects passed as resolver sources do not contain any reference to the content they
// belong to. The Guillotine app sets the current content as a serialized JSON string in the local
// context for all fields below a content object.
export const getCurrentContentFromLocalContext = (
    env: ResolverEnv
): { _id?: string; _path?: string } | null => {
    const currentContent = env.localContext?.__currentContent;
    if (!currentContent) {
        return null;
    }

    if (typeof currentContent !== 'string') {
        return currentContent;
    }

    try {
        return JSON.parse(currentContent);
    } catch {
        return null;
    }
};
