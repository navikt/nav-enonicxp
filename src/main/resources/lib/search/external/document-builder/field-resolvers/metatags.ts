import { ContentNode } from '../../../../../types/content-types/content-config';

export type SearchDocumentMetatag =
    | 'nyhet'
    | 'pressemelding'
    | 'nav-og-samfunn'
    | 'analyse'
    | 'statistikk'
    | 'presse';

const isNyhet = (content: ContentNode) =>
    (content.type === 'no.nav.navno:main-article' && content.data.contentType === 'news') ||
    content.type === 'no.nav.navno:current-topic-page';

const isPressemelding = (content: ContentNode) =>
    content.type === 'no.nav.navno:main-article' && content.data.contentType === 'pressRelease';

const isStatistikk = (content: ContentNode) =>
    content.type === 'no.nav.navno:large-table' ||
    (content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/statistikk') &&
        (content.type !== 'no.nav.navno:main-article' ||
            content.data.contentType === 'lastingContent'));

const isAnalyse = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/kunnskap');

const isNavOgSamfunn = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn') &&
    !content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/statistikk');

const isPresse = (content: ContentNode) =>
    isPressemelding(content) ||
    (isNyhet(content) &&
        (content._path.startsWith(
            '/content/www.nav.no/no/person/innhold-til-person-forside/nyheter*'
        ) ||
            content._path.startsWith(
                '/content/www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav'
            ) ||
            !(
                content._path.startsWith('/content/www.nav.no/no/person') ||
                content._path.startsWith('/content/www.nav.no/no/bedrift') ||
                content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn')
            )));

export const getSearchDocumentMetatags = (content: ContentNode) => {
    const metaTags: SearchDocumentMetatag[] = [];

    if (isNyhet(content)) {
        metaTags.push('nyhet');
    }
    if (isPressemelding(content)) {
        metaTags.push('pressemelding');
    }
    if (isStatistikk(content)) {
        metaTags.push('statistikk');
    }
    if (isAnalyse(content)) {
        metaTags.push('analyse');
    }
    if (isNavOgSamfunn(content)) {
        metaTags.push('nav-og-samfunn');
    }
    if (isPresse(content)) {
        metaTags.push('presse');
    }

    return metaTags.length > 0 ? metaTags : undefined;
};
