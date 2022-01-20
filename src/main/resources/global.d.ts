declare const app: {
    name: string;
    version: string;
};

declare const log: {
    info: (...args: any[]) => void;
    warning: (...args: any[]) => void;
    error: (...args: any[]) => void;
};
