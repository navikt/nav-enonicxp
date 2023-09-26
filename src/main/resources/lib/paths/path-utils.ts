import { NAVNO_ROOT_PATH } from '../constants';
import { Content } from '/lib/xp/content';

type ContentWithExternalProductUrl = Content & { data: { externalProductUrl: string } };

const navnoRootPathFilter = new RegExp(`^(/content)?${NAVNO_ROOT_PATH}`);

export const stripPathPrefix = (path: string) => path.replace(navnoRootPathFilter, '');

export const getParentPath = (path: string) => path.split('/').slice(0, -1).join('/');

export const hasExternalProductUrl = (
    content: Content | ContentWithExternalProductUrl
): content is ContentWithExternalProductUrl =>
    !!(content as ContentWithExternalProductUrl).data?.externalProductUrl;
