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
