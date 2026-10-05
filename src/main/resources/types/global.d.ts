declare const app: {
    name: 'no.nav.navno';
    version: string;
    config: {
        env: 'p' | 'dev' | 'q6' | 'localhost' | 'test';
        serviceSecret: string;
        searchApiKey: string;
        // Optional override for the internal Guillotine app endpoint used by runGuillotineQuery
        guillotineApiUrl?: string;
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

declare module '*.graphql' {
    // import { DocumentNode } from 'graphql';
    const schema: string;

    export = schema;
}
