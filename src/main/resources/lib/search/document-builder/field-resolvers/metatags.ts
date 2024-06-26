import { ContentNode } from '../../../../types/content-types/content-config';
import { getSearchDocumentContentType, SearchDocumentContentType } from './content-type';

export type SearchDocumentMetatag =
    | 'nyhet'
    | 'pressemelding'
    | 'analyse'
    | 'statistikk'
    | 'presse'
    | 'informasjon';

const informationTypes: ReadonlySet<SearchDocumentContentType> = new Set([
    'legacy',
    'produktside',
    'temaside',
    'guide',
    'situasjonsside',
    'oversikt',
    'andre',
]);

const isInformation = (content: ContentNode) =>
    informationTypes.has(getSearchDocumentContentType(content));

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

const pressePaths = [
    // "innhold-til-person-forside" news are included for historical reasons. Can be removed if/when the news under
    // this folder are moved to a more logical parent folder
    '/content/www.nav.no/no/person/innhold-til-person-forside/nyheter',
    '/content/www.nav.no/no/samarbeidspartner/presse',
] as const;

const isPresse = (content: ContentNode) =>
    isPressemelding(content) ||
    (isNyhet(content) && pressePaths.some((path) => content._path.startsWith(path)));

export const getSearchDocumentMetatags = (content: ContentNode) => {
    const metaTags: SearchDocumentMetatag[] = [];

    let canSetInformationTag = true;

    if (isNyhet(content)) {
        metaTags.push('nyhet');
        canSetInformationTag = false;
    }
    if (isPressemelding(content)) {
        metaTags.push('pressemelding');
        canSetInformationTag = false;
    }
    if (isStatistikk(content)) {
        metaTags.push('statistikk');
        canSetInformationTag = false;
    }
    if (isAnalyse(content)) {
        metaTags.push('analyse');
        canSetInformationTag = false;
    }
    if (isPresse(content)) {
        metaTags.push('presse');
        canSetInformationTag = false;
    }
    if (canSetInformationTag && isInformation(content)) {
        metaTags.push('informasjon');
    }

    return metaTags;
};
