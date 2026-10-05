import { GuillotineGraphQL } from '../lib/guillotine/utils/creation-callback-utils';
import { buildSchemaExtensions } from '../lib/guillotine/schema/schema-creation-callbacks';

// Schema extensions for the Guillotine app. This file is loaded by the Guillotine app, and must be
// located at /guillotine/guillotine.js in our app.
export const extensions = (graphQL: GuillotineGraphQL) => buildSchemaExtensions(graphQL);
