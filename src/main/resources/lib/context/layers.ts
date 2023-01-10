import projectLib from '/lib/xp/project';
import { Locale } from '../../types/common';
import { runInContext } from './run-in-context';
import { logger } from '../utils/logging';

export const populateLayersMap = () => {
    const projects = runInContext({ asAdmin: true }, () => projectLib.list());
    logger.info(JSON.stringify(projects));
};

export const runInLocaleContext = <ReturnType>(
    func: () => ReturnType,
    locale: Locale
): ReturnType => {
    return runInContext({}, func);
};
