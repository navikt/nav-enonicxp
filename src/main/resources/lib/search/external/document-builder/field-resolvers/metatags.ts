import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';

type ContentNode = RepoNode<Content>;

export type SearchDocumentMetatag =
    | 'kontor'
    | 'skjema'
    | 'nyhet'
    | 'pressemelding'
    | 'nav-og-samfunn' // legg til
    | 'analyse'
    | 'statistikk'
    | 'presse'; // legg til

const isKontor = (content: ContentNode) => content.type === 'no.nav.navno:office-branch';

const isSkjema = (content: ContentNode) => content.type === 'no.nav.navno:form-details';

const isNyhet = (content: ContentNode) =>
    content.type === 'no.nav.navno:main-article' && content.data.contentType === 'news';

const isPressemelding = (content: ContentNode) =>
    content.type === 'no.nav.navno:main-article' && content.data.contentType === 'pressRelease';

const isStatistikk = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/statistikk') &&
    (content.type !== 'no.nav.navno:main-article' || content.data.contentType !== 'lastingContent');

const isAnalyse = (content: ContentNode) =>
    content._path.startsWith('/content/www.nav.no/no/nav-og-samfunn/kunnskap');

export const getSearchDocumentMetatags = (content: ContentNode) => {
    const metaTags: SearchDocumentMetatag[] = [];

    if (isKontor(content)) {
        metaTags.push('kontor');
    }
    if (isSkjema(content)) {
        metaTags.push('skjema');
    }
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

    return metaTags.length > 0 ? metaTags : undefined;
};
