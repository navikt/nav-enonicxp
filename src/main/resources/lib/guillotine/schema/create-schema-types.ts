import { Context } from '/lib/guillotine';
import genericLib from '/lib/guillotine/generic';
import dynamicLib from '/lib/guillotine/dynamic';

export const createSchemaTypes = (context: Context) => {
    // Generate built-in types
    genericLib.createTypes(context);
    dynamicLib.createTypes(context);
};
