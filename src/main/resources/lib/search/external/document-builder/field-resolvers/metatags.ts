import { ContentNode } from '../../../../../types/content-types/content-config';

export type SearchDocumentMetatag =
    | 'nyhet'
    | 'pressemelding'
    | 'nav-og-samfunn'
    | 'analyse'
    | 'statistikk'
    | 'presse'
    | 'informasjon';

const isNyhet = (content: ContentNode) =>
    (content.type === 'no.nav.navno:main-article' &&
        (content.data.contentType === 'news' || content.data.contentType === 'pressRelease')) ||
    content.type === 'no.nav.navno:current-topic-page';

const isPressemelding = (content: ContentNode) =>
    content.type === 'no.nav.navno:main-article' && content.data.contentType === 'pressRelease';

const isStatistikk = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/statistikk') ||
    content.type === 'no.nav.navno:large-table';

const isAnalyse = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/kunnskap');

const isNavOgSamfunn = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn') &&
    !content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/statistikk');

const isPresse = (content: ContentNode) =>
    isPressemelding(content) ||
    (isNyhet(content) &&
        (content._path.startsWith(
            '/content/www.nav.no/no/person/innhold-til-person-forside/nyheter'
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

    let shouldSetDefaultTag = true;

    if (isNyhet(content)) {
        metaTags.push('nyhet');
        shouldSetDefaultTag = false;
    }
    if (isPressemelding(content)) {
        metaTags.push('pressemelding');
        shouldSetDefaultTag = false;
    }
    if (isStatistikk(content)) {
        metaTags.push('statistikk');
        shouldSetDefaultTag = false;
    }
    if (isAnalyse(content)) {
        metaTags.push('analyse');
        shouldSetDefaultTag = false;
    }
    if (isPresse(content)) {
        metaTags.push('presse');
        shouldSetDefaultTag = false;
    }
    if (isNavOgSamfunn(content)) {
        metaTags.push('nav-og-samfunn');
    }

    if (shouldSetDefaultTag) {
        metaTags.push('informasjon');
    }

    return metaTags;
};
