import contextLib from '/lib/xp/context';

type LogLevel = 'info' | 'warning' | 'error';

const checkContextAndLog = (level: LogLevel, msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    if (logAsInfoInDraftContext && contextLib.get()?.branch === 'draft') {
        log.info(msg);
    } else {
        log[level](`[${level}]${content?'[editorial]':''} ${msg}`);
    }
};

const logInfo = (msg: string) => {
    log.info(`[info] ${msg}`);
};

const logWarning = (msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    checkContextAndLog('warning', msg, logAsInfoInDraftContext, content);
};

const logError = (msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    checkContextAndLog('error', msg, logAsInfoInDraftContext, content);
};

const logCriticalError = (msg: string, logAsInfoInDraftContext?: boolean, content?: boolean) => {
    checkContextAndLog('error', msg, logAsInfoInDraftContext, content);
};

export const logger = {
    info: logInfo,
    warning: logWarning,
    error: logError,
    critical: logCriticalError,
};
