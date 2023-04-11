import { NAVNO_ROOT_PATH } from '../constants';

const navnoRootPathFilter = new RegExp(`^(/content)?${NAVNO_ROOT_PATH}`);

export const stripPathPrefix = (path: string) => path.replace(navnoRootPathFilter, '');

export const getParentPath = (path: string) => path.split('/').slice(0, -1).join('/');

export const getFrontendPathname = (path: string) => path.replace(navnoRootPathFilter, '/');
