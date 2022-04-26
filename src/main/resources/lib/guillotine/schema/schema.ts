import guillotineLib from '/lib/guillotine';
import { redirectsRootPath } from '../../constants';
import { schemaCreationCallbacks } from './schema-creation-callbacks';

const schemaContextOptions = {
    creationCallbacks: schemaCreationCallbacks,
    applications: [app.name, 'navno.nav.no.search'],
    allowPaths: [redirectsRootPath],
};

const initAndCreateSchema = () => {
    return guillotineLib.createSchema(schemaContextOptions);
};

export const schema = initAndCreateSchema();
