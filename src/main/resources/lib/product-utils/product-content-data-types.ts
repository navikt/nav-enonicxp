import { Content } from '/lib/xp/content';
import { PageMeta } from '../../site/content-types/page-meta/page-meta';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { contentTypesWithPageMeta } from '../contenttype-lists';
import { EmptyObject } from '../../types/util-types';

type ContentTypeWithPageMetaData = (typeof contentTypesWithPageMeta)[number];

type PageMetaOptionsMap = typeof contentTypeToPageMetaOptionKey;

type PageMetaDataOptions = PageMeta['contentType'];

type PageMetaOptionKey = PageMetaDataOptions['_selected'];

type ContentTypeToPageMetaOption = {
    [Key in ContentTypeWithPageMetaData]: Extract<
        PageMetaDataOptions,
        { _selected: PageMetaOptionsMap[Key] } & Record<PageMetaOptionsMap[Key], unknown>
    >[PageMetaOptionsMap[Key]];
};

export type ContentWithResolvedData<ContentType extends ContentDescriptor> = Content<ContentType> &
    (ContentType extends ContentTypeWithPageMetaData
        ? ContentTypeToPageMetaOption[ContentType]
        : EmptyObject);

const contentTypeToPageMetaOptionKey = {
    'no.nav.navno:product-page-v2': 'product_page',
    'no.nav.navno:current-topic-page-v2': 'current_topic_page',
    'no.nav.navno:generic-page-v2': 'generic_page',
    'no.nav.navno:guide-page-v2': 'guide_page',
    'no.nav.navno:situation-page-v2': 'situation_page',
    'no.nav.navno:themed-article-page-v2': 'themed_article_page',
    'no.nav.navno:tools-page-v2': 'tools_page',
} as const satisfies { [key in ContentDescriptor]?: PageMetaOptionKey };

export const getPageMetaOptionKey = (
    contentType: ContentDescriptor
): PageMetaOptionKey | undefined => {
    return contentTypeToPageMetaOptionKey[contentType as ContentTypeWithPageMetaData];
};
