import contextLib from '/lib/xp/context';

// Includes custom loglevel 'critical' with uses log.error()
type LogLevel = 'info' | 'warning' | 'error' | 'critical';

const checkContextAndLog = (
        customLevel: LogLevel,
        msg: string,
        logAsInfoInDraftContext?: boolean,
        content?: boolean
    ) => {
    const level = (logAsInfoInDraftContext && contextLib.get()?.branch === 'draft' ? 'info'
        : customLevel === 'critical' ? 'error' : customLevel
    );
    log[level](`[${customLevel}]${content?'[editorial]':''} ${msg}`);
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
    checkContextAndLog('critical', msg, logAsInfoInDraftContext, content);
};

export const logger = {
    info: logInfo,
    warning: logWarning,
    error: logError,
    critical: logCriticalError,
};
