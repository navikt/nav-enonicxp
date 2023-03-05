import { NAVNO_ROOT_PATH } from '../constants';

const navnoRootPathFilter = new RegExp(`^${NAVNO_ROOT_PATH}`);

export const stripPathPrefix = (_path: string) => _path.replace(navnoRootPathFilter, '');

export const getParentPath = (path: string) => path.split('/').slice(0, -1).join('/');
