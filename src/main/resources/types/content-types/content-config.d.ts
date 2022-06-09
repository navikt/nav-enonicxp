import { GlobalNumberValueSetData } from './global-value-set';
import { Component } from '/lib/xp/portal';
import { AnimatedIcons } from '../../site/content-types/animated-icons/animated-icons';
import { Calculator } from '../../site/content-types/calculator/calculator';
import { ContentList } from '../../site/content-types/content-list/content-list';
import { ContentPageWithSidemenus } from '../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';
import { DynamicPage } from '../../site/content-types/dynamic-page/dynamic-page';
import { ExternalLink } from '../../site/content-types/external-link/external-link';
import { GuidePage } from '../../site/content-types/guide-page/guide-page';
import { ThemedArticlePage } from '../../site/content-types/themed-article-page/themed-article-page';
import { InternalLink } from '../../site/content-types/internal-link/internal-link';
import { LargeTable } from '../../site/content-types/large-table/large-table';
import { MainArticle } from '../../site/content-types/main-article/main-article';
import { MainArticleChapter } from '../../site/content-types/main-article-chapter/main-article-chapter';
import { MegamenuItem } from '../../site/content-types/megamenu-item/megamenu-item';
import { Melding } from '../../site/content-types/melding/melding';
import { OfficeInformation } from '../../site/content-types/office-information/office-information';
import { PageList } from '../../site/content-types/page-list/page-list';
import { ProductDetails } from '../../site/content-types/product-details/product-details';
import { PublishingCalendar } from '../../site/content-types/publishing-calendar/publishing-calendar';
import { SectionPage } from '../../site/content-types/section-page/section-page';
import { Overview } from '../../site/content-types/overview/overview';
import { SituationPage } from '../../site/content-types/situation-page/situation-page';
import { ToolsPage } from '../../site/content-types/tools-page/tools-page';
import { TransportPage } from '../../site/content-types/transport-page/transport-page';
import { NavNoDescriptor } from '../common';
import { EmptyObject } from '../util-types';
import { ContactInformation } from '../../site/content-types/contact-information/contact-information';
import { PublishingCalendarEntry } from '../../site/content-types/publishing-calendar-entry/publishing-calendar-entry';
import { GlobalCaseTimeSetData } from './global-case-time-set';
import { PayoutDates } from '../../site/content-types/payout-dates/payout-dates';

type CustomContentDataConfigsWithoutDescriptor = {
    'animated-icons': AnimatedIcons;
    calculator: Calculator;
    'contact-information': ContactInformation;
    'content-list': ContentList;
    'content-page-with-sidemenus': ContentPageWithSidemenus;
    'dynamic-page': DynamicPage;
    'external-link': ExternalLink;
    'global-case-time-set': GlobalCaseTimeSetData;
    'global-value-set': GlobalNumberValueSetData;
    'guide-page': GuidePage;
    'internal-link': InternalLink;
    'large-table': LargeTable;
    'main-article': MainArticle;
    'main-article-chapter': MainArticleChapter;
    'megamenu-item': MegamenuItem;
    melding: Melding;
    'office-information': OfficeInformation;
    'page-list': PageList;
    'payout-dates': PayoutDates;
    'publishing-calendar': PublishingCalendar;
    'publishing-calendar-entry': PublishingCalendarEntry;
    'product-details': ProductDetails;
    'generic-page': ContentPageWithSidemenus;
    'section-page': SectionPage;
    overview: Overview;
    'situation-page': SituationPage;
    'themed-article-page': ThemedArticlePage;
    'tools-page': ToolsPage;
    'transport-page': TransportPage;
};

// Add the app-specific descriptor prefix to all content types
export type CustomContentDataConfigs = {
    [Type in keyof CustomContentDataConfigsWithoutDescriptor as NavNoDescriptor<Type>]: CustomContentDataConfigsWithoutDescriptor[Type];
};

export type ContentDataMapper<Type extends ContentDescriptor> = Type extends CustomContentDescriptor
    ? {
          type: Type;
          data: CustomContentDataConfigs[Type];
          page: Component<'page'> | EmptyObject;
      }
    : Type extends 'portal:fragment'
    ? {
          type: 'portal:fragment';
          fragment: Component<'part' | 'layout'>;
          data: undefined;
      }
    : Type extends 'portal:page-template'
    ? {
          type: 'portal:page-template';
          data: { supports?: CustomContentDescriptor | CustomContentDescriptor[] };
          page: Component<'page'> | EmptyObject;
      }
    : Type extends 'portal:site'
    ? {
          type: 'portal:site';
          data: undefined;
      }
    : never;

export type BuiltinContentDescriptor =
    | 'portal:fragment'
    | 'portal:template-folder'
    | 'portal:page-template'
    | 'portal:site'
    | 'base:folder'
    | 'no.nav.navno:url';

export type MediaDescriptor = `media:${string}`;

export type CustomContentName = keyof CustomContentDataConfigsWithoutDescriptor;

export type CustomContentDescriptor = keyof CustomContentDataConfigs;

export type ContentDescriptor =
    | MediaDescriptor
    | CustomContentDescriptor
    | BuiltinContentDescriptor;

// TODO: add x-data
// TODO: add media/portal/base types
