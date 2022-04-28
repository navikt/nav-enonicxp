import { print } from 'graphql';

import test from './src/main/resources/lib/guillotine/queries/sitecontent/content-queries/large-table.graphql';

console.log(print(test));