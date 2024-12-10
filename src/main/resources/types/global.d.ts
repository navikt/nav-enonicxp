declare const app: {
    name: 'no.nav.navno';
    version: string;
    config: {
        env: 'p' | 'dev' | 'q6' | 'localhost' | 'test';
        serviceSecret: string;
        searchApiKey: string;
    };
};

declare const log: {
    info: (...args: any[]) => void;
    warning: (...args: any[]) => void;
    error: (...args: any[]) => void;
};

declare const Java: any;

declare const resolve: any;

declare const __: any;

declare const com: {
    enonic: { lib: { graphql: { rx: { Publisher: any } } } };
};

declare module '*.graphql' {
    // import { DocumentNode } from 'graphql';
    const schema: string;

    export = schema;
}

// TODO: remove if/when type definitions are added for these libraries
declare module '*/lib/guillotine/dynamic/form';
declare module '*/lib/guillotine/graphql';
declare module '*/lib/guillotine/macro';
declare module '*/lib/guillotine/util/naming';
declare module '*/lib/graphql-rx';
declare module '*/lib/guillotine/query/root-query';
declare module '*/lib/guillotine/subscription/root-subscription';
declare module '*/lib/guillotine/generic';
declare module '*/lib/guillotine/dynamic';
