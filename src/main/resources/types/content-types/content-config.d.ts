import { Component } from '/lib/xp/portal';
import { BaseMedia } from '/lib/xp/content';
import { GlobalNumberValueSetData } from './global-value-set';
import { AnimatedIcons } from '../../site/content-types/animated-icons/animated-icons';
import { Calculator } from '../../site/content-types/calculator/calculator';
import { ContentList } from '../../site/content-types/content-list/content-list';
import { ContentPageWithSidemenus } from '../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';
import { GenericPage } from '../../site/content-types/generic-page/generic-page';
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
import { FormDetails } from '../../site/content-types/form-details/form-details';
import { PublishingCalendar } from '../../site/content-types/publishing-calendar/publishing-calendar';
import { SectionPage } from '../../site/content-types/section-page/section-page';
import { Overview } from '../../site/content-types/overview/overview';
import { SituationPage } from '../../site/content-types/situation-page/situation-page';
import { OfficeEditorialPage } from '../../site/content-types/office-editorial-page/office-editorial-page';
import { ToolsPage } from '../../site/content-types/tools-page/tools-page';
import { TransportPage } from '../../site/content-types/transport-page/transport-page';
import { NavNoDescriptor } from '../common';
import { EmptyObject } from '../util-types';
import { ContactInformation } from '../../site/content-types/contact-information/contact-information';
import { PublishingCalendarEntry } from '../../site/content-types/publishing-calendar-entry/publishing-calendar-entry';
import { GlobalCaseTimeSetData } from './global-case-time-set';
import { PayoutDates } from '../../site/content-types/payout-dates/payout-dates';
import { FrontPage } from '../../site/content-types/front-page/front-page';
import { AreaPage } from '../../site/content-types/area-page/area-page';
import { OfficeBranch } from 'site/content-types/office-branch/office-branch';
import { CurrentTopicPage } from 'site/content-types/current-topic-page/current-topic-page';
import { Video } from 'site/content-types/video/video';
import { FormIntermediateStep } from 'site/content-types/form-intermediate-step/form-intermediate-step';
import {
    SearchConfigData,
    SearchConfigDescriptor,
    SearchExternalResourceData,
    SearchExternalResourceDescriptor,
} from './search-config';
import { PressLandingPage } from 'site/content-types/press-landing-page/press-landing-page';

type CustomContentDataConfigsWithoutDescriptor = {
    'animated-icons': AnimatedIcons;
    'area-page': AreaPage;
    calculator: Calculator;
    'contact-information': ContactInformation;
    'content-list': ContentList;
    'content-page-with-sidemenus': ContentPageWithSidemenus;
    'dynamic-page': DynamicPage;
    'external-link': ExternalLink;
    'front-page': FrontPage;
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
    'office-branch': OfficeBranch;
    'current-topic-page': CurrentTopicPage;
    'page-list': PageList;
    'payout-dates': PayoutDates;
    'publishing-calendar': PublishingCalendar;
    'publishing-calendar-entry': PublishingCalendarEntry;
    'product-details': ProductDetails;
    'form-intermediate-step': FormIntermediateStep;
    'form-details': FormDetails;
    'generic-page': GenericPage;
    'section-page': SectionPage;
    overview: Overview;
    'redirects-folder': EmptyObject;
    'situation-page': SituationPage;
    'office-editorial-page': OfficeEditorialPage;
    'themed-article-page': ThemedArticlePage;
    'tools-page': ToolsPage;
    'transport-page': TransportPage;
    'press-landing-page': PressLandingPage;
    video: Video;
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
    : Type extends 'portal:site' | 'base:folder'
    ? {
          type: Type;
          data: undefined;
      }
    : Type extends SearchConfigDescriptor
    ? { type: Type; data: SearchConfigData }
    : Type extends SearchExternalResourceDescriptor
    ? { type: Type; data: SearchExternalResourceData }
    : Type extends MediaDescriptor
    ? {
          type: Type;
          data: BaseMedia;
      }
    : never;

export type BuiltinContentDescriptor =
    | 'portal:fragment'
    | 'portal:template-folder'
    | 'portal:page-template'
    | 'portal:site'
    | 'base:folder'
    | 'no.nav.navno:url';

export type MediaDescriptor =
    | 'media:archive'
    | 'media:audio'
    | 'media:code'
    | 'media:data'
    | 'media:document'
    | 'media:executable'
    | 'media:image'
    | 'media:presentation'
    | 'media:spreadsheet'
    | 'media:text'
    | 'media:unknown'
    | 'media:vector'
    | 'media:video';

export type CustomContentName = keyof CustomContentDataConfigsWithoutDescriptor;

export type CustomContentDescriptor = keyof CustomContentDataConfigs;

export type ContentDescriptor =
    | MediaDescriptor
    | CustomContentDescriptor
    | BuiltinContentDescriptor
    | SearchConfigDescriptor
    | SearchExternalResourceDescriptor;

// TODO: add x-data
