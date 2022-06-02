import contextLib from '/lib/xp/context';

type LogLevel = 'info' | 'warning' | 'error';

const checkContextAndLog = (msg: string, level: LogLevel, logAsInfoInDraftContext?: boolean) => {
    if (logAsInfoInDraftContext && contextLib.get()?.branch === 'draft') {
        log.info(msg);
    } else {
        log[level](msg);
    }
};

const logInfo = (msg: string) => {
    log.info(`[info] ${msg}`);
};

const logWarning = (msg: string, logAsInfoInDraftContext?: boolean) => {
    checkContextAndLog(`[warning] ${msg}`, 'warning', logAsInfoInDraftContext);
};

const logError = (msg: string, logAsInfoInDraftContext?: boolean) => {
    checkContextAndLog(`[error] ${msg}`, 'error', logAsInfoInDraftContext);
};

const logCriticalError = (msg: string, logAsInfoInDraftContext?: boolean) => {
    checkContextAndLog(`[critical] ${msg}`, 'error', logAsInfoInDraftContext);
};

export const logger = {
    info: logInfo,
    warning: logWarning,
    error: logError,
    critical: logCriticalError,
};
