import guillotineLib from '/lib/guillotine';
import { schemaCreationCallbacks } from './schema-creation-callbacks';

const schemaContextOptions = {
    creationCallbacks: schemaCreationCallbacks,
    applications: [app.name, 'navno.nav.no.search'],
};

const initAndCreateSchema = () => {
    return guillotineLib.createSchema(schemaContextOptions);
};

export const schema = initAndCreateSchema();
