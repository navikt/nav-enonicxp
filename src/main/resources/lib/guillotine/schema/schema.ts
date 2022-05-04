import guillotineLib from '/lib/guillotine';
import rootQueryLib from '/lib/guillotine/query/root-query';
import rootSubscriptionLib from '/lib/guillotine/subscription/root-subscription';
import { redirectsRootPath } from '../../constants';
import { schemaCreationCallbacks } from './schema-creation-callbacks';
import { createSchemaTypes } from './create-schema-types';

const schemaContextOptions = {
    creationCallbacks: schemaCreationCallbacks,
    applications: [app.name, 'navno.nav.no.search'],
    allowPaths: [redirectsRootPath],
};

const initAndCreateSchema = () => {
    const context = guillotineLib.createContext(schemaContextOptions);

    createSchemaTypes(context);

    return context.schemaGenerator.createSchema({
        query: rootQueryLib.createRootQueryType(context),
        subscription: rootSubscriptionLib.createRootSubscriptionType(context),
        dictionary: context.dictionary as any,
    });
};

export const schema = initAndCreateSchema();
