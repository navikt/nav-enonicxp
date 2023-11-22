import { NAVNO_ROOT_PATH, REDIRECTS_PATH } from '../constants';
import { Content, CONTENT_ROOT_PATH } from '/lib/xp/content';

type ContentWithExternalProductUrl = Content & { data: { externalProductUrl: string } };

const navnoRootPathFilter = new RegExp(`^(${CONTENT_ROOT_PATH})?${NAVNO_ROOT_PATH}`);

const redirectsPathFilter = new RegExp(
    `^(${CONTENT_ROOT_PATH})?(${NAVNO_ROOT_PATH})?${REDIRECTS_PATH}`
);

export const stripPathPrefix = (path: string) => path.replace(navnoRootPathFilter, '');

export const getParentPath = (path: string) => path.split('/').slice(0, -1).join('/');

export const hasExternalProductUrl = (
    content: Content | ContentWithExternalProductUrl
): content is ContentWithExternalProductUrl =>
    !!(content as ContentWithExternalProductUrl).data?.externalProductUrl;

export const stripRedirectsPathPrefix = (path: string) => path.replace(redirectsPathFilter, '');
