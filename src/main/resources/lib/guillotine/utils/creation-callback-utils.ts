import graphQlLib, { CreateObjectTypeParams } from '/lib/graphql';
import { ContextOptions } from '/lib/guillotine';

export type CreationCallback = ContextOptions['creationCallbacks'][string];

const schemaGenerator = graphQlLib.newSchemaGenerator();

export const graphQlCreateObjectType = ({
    name,
    fields,
    description = '',
    interfaces = [],
}: Pick<CreateObjectTypeParams, 'name' | 'fields'> & Partial<CreateObjectTypeParams>) => {
    return schemaGenerator.createObjectType({ name, fields, description, interfaces });
};
