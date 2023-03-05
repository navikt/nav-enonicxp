import { attachmentUrl, pageUrl } from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import { hasValidCustomPath } from '../custom-paths/custom-paths';

export const getPaths = (content: Content) => {
    const paths = {
        href: '',
        displayPath: '',
    };

    const customPath = hasValidCustomPath(content) ? content.data.customPath : undefined;

    if (
        content.type === 'navno.nav.no.search:search-api2' ||
        content.type === 'no.nav.navno:external-link'
    ) {
        paths.href = content.data.url;
    } else if (
        content.type === 'media:document' ||
        content.type === 'media:spreadsheet' ||
        content.type === 'media:image'
    ) {
        paths.href = attachmentUrl({
            id: content._id,
        });
    } else if (customPath) {
        paths.href = pageUrl({
            path: `/www.nav.no${customPath}`,
            type: 'absolute',
        });
    } else {
        paths.href = pageUrl({
            id: content._id,
            type: 'absolute',
        });
    }

    if (
        content.type === 'media:document' ||
        content.type === 'media:spreadsheet' ||
        content.type === 'media:image'
    ) {
        paths.displayPath = pageUrl({ id: content._id }).split('/').slice(0, -1).join('/');
    } else if (customPath) {
        paths.displayPath = customPath;
    } else if (paths.href.indexOf('http') === 0) {
        // find display path for absolute urls
        paths.displayPath = paths.href.replace(/^https:\/\/(www\.)?((dev|q6)\.)?nav\.no\//, '/');
    } else {
        // display path for everything else
        paths.displayPath = paths.href.split('/').slice(0, -1).join('/');
    }

    return paths;
};
