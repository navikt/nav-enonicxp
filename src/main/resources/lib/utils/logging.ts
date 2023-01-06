import contextLib from '/lib/xp/context';

// Note: the file/line arguments are injected at build-time from the nashorn
// __FILE__/__LINE__ globals via babel plugin and should not be set manually
// (see babel-logger-transformer.js)

// Includes custom loglevel 'critical' which uses log.error()
type LogLevel = 'info' | 'warning' | 'error' | 'critical';

const formatMsg = (
    msg: string,
    level: LogLevel,
    file: string,
    line: string,
    isEditorialError?: boolean
) => {
    const filename = file.split(':')[1];
    return `(${filename} [${line}])${level === 'critical' ? ' [critical]' : ''}${
        isEditorialError ? ' [editorial]' : ''
    } ${msg}`;
};

const checkContextAndLog = (
    customLevel: LogLevel,
    msg: string,
    file: string,
    line: string,
    logAsInfoInDraftContext?: boolean,
    content?: boolean
) => {
    const level =
        logAsInfoInDraftContext && contextLib.get()?.branch === 'draft'
            ? 'info'
            : customLevel === 'critical'
            ? 'error'
            : customLevel;
    log[level](formatMsg(msg, customLevel, file, line, content));
};

const logInfo = (msg: string, file?: never, line?: never) => {
    log.info(formatMsg(msg, 'info', file as unknown as string, line as unknown as string));
};

const logWarning = (
    msg: string,
    logAsInfoInDraftContext?: boolean,
    content?: boolean,
    file?: never,
    line?: never
) => {
    checkContextAndLog(
        'warning',
        msg,
        file as unknown as string,
        line as unknown as string,
        logAsInfoInDraftContext,
        content
    );
};

const logError = (
    msg: string,
    logAsInfoInDraftContext?: boolean,
    content?: boolean,
    file?: never,
    line?: never
) => {
    checkContextAndLog(
        'error',
        msg,
        file as unknown as string,
        line as unknown as string,
        logAsInfoInDraftContext,
        content
    );
};

const logCriticalError = (
    msg: string,
    logAsInfoInDraftContext?: boolean,
    content?: boolean,
    file?: never,
    line?: never
) => {
    checkContextAndLog(
        'critical',
        msg,
        file as unknown as string,
        line as unknown as string,
        logAsInfoInDraftContext,
        content
    );
};

export const logger = {
    info: logInfo,
    warning: logWarning,
    error: logError,
    critical: logCriticalError,
};
