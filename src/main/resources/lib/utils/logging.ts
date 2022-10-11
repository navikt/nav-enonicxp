import contextLib from '/lib/xp/context';

type LogLevel = 'info' | 'warning' | 'error';

const checkContextAndLog = (msg: string, level: LogLevel, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    const logMsg = `${content?'[content]':''}${msg}`;
    if (logAsInfoInDraftContext && contextLib.get()?.branch === 'draft') {
        log.info(logMsg);
    } else {
        log[level](logMsg);
    }
};

const logInfo = (msg: string) => {
    log.info(`[info] ${msg}`);
};

const logWarning = (msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    checkContextAndLog(`[warning] ${msg}`, 'warning', logAsInfoInDraftContext, content);
};

const logError = (msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    checkContextAndLog(`[error] ${msg}`, 'error', logAsInfoInDraftContext, content);
};

const logCriticalError = (msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    checkContextAndLog(`[critical] ${msg}`, 'error', logAsInfoInDraftContext, content);
};

export const logger = {
    info: logInfo,
    warning: logWarning,
    error: logError,
    critical: logCriticalError,
};
