const logInfo = (msg: string) => {
    log.info(`[info] ${msg}`);
};

const logWarning = (msg: string) => {
    log.warning(`[warning] ${msg}`);
};

const logError = (msg: string) => {
    log.error(`[error] ${msg}`);
};

const logCriticalError = (msg: string) => {
    log.error(`[critical] ${msg}`);
};

export const logger = {
    info: logInfo,
    warning: logWarning,
    error: logError,
    critical: logCriticalError,
};
