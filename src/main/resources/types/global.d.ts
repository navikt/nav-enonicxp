declare const app: {
    name: 'no.nav.navno';
    version: string;
    config: {
        env: string;
        norg2: string;
        norg2ApiKey: string;
        norg2ConsumerId: string;
        frontendOrigin: string;
        xpOrigin: string;
        revalidatorProxyOrigin: string;
        serviceSecret: string;
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

// TODO: remove if/when type definitions are added for these libraries
declare module '*/lib/guillotine/dynamic/form';
declare module '*/lib/guillotine/graphql';
declare module '*/lib/guillotine/macro';
declare module '*/lib/guillotine/util/naming';
declare module '*/lib/graphql-rx';
