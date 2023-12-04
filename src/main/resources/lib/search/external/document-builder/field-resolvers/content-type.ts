import { ContentDescriptor, ContentNode } from '../../../../../types/content-types/content-config';
import { isMedia } from '../../../../utils/content-utils';

export type SearchDocumentContentType =
    | 'legacy'
    | 'kontor-legacy'
    | 'kontor'
    | 'tabell'
    | 'skjema'
    | 'produktside'
    | 'temaside'
    | 'guide'
    | 'aktuelt'
    | 'situasjonsside'
    | 'oversikt'
    | 'skjemaoversikt'
    | 'fil-spreadsheet'
    | 'fil-document'
    | 'fil-andre'
    | 'andre';

const xpContentTypeToSearchContentType: {
    [key in ContentDescriptor]?: SearchDocumentContentType;
} = {
    'no.nav.navno:main-article': 'legacy',
    'no.nav.navno:main-article-chapter': 'legacy',
    'no.nav.navno:section-page': 'legacy',
    'no.nav.navno:page-list': 'legacy',
    'no.nav.navno:office-information': 'kontor-legacy',
    'no.nav.navno:office-branch': 'kontor',
    'no.nav.navno:large-table': 'tabell',
    'no.nav.navno:form-details': 'skjema',
    'no.nav.navno:content-page-with-sidemenus': 'produktside',
    'no.nav.navno:themed-article-page': 'temaside',
    'no.nav.navno:guide-page': 'guide',
    'no.nav.navno:current-topic-page': 'aktuelt',
    'no.nav.navno:situation-page': 'situasjonsside',
    'no.nav.navno:forms-overview': 'skjemaoversikt',
    'no.nav.navno:overview': 'oversikt',
    'media:spreadsheet': 'fil-spreadsheet',
    'media:document': 'fil-document',
} as const;

export const getSearchDocumentContentType = (content: ContentNode): SearchDocumentContentType => {
    return (
        xpContentTypeToSearchContentType[content.type] || (isMedia(content) ? 'fil-andre' : 'andre')
    );
};
