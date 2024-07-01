declare const global: {
    Java: any;
    log: any;
};

global.Java = {
    type: () => ({}),
};

global.log = {
    debug: console.debug,
    info: console.log,
    warning: console.warn,
    error: console.error,
};

export {};
