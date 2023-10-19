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
import { FrontPageNested } from '../../site/content-types/front-page/front-page-nested';
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
import { FormsOverview } from '../../site/content-types/forms-overview/forms-overview';
import { FragmentCreator } from '../../site/content-types/fragment-creator/fragment-creator';
import { PageMeta } from 'site/content-types/page-meta/page-meta';
import { ProductPageV2 } from 'site/content-types/product-page-v2/product-page-v2';
import { CurrentTopicPageV2 } from 'site/content-types/current-topic-page-v2/current-topic-page-v2';
import { GenericPageV2 } from 'site/content-types/generic-page-v2/generic-page-v2';
import { GuidePageV2 } from 'site/content-types/guide-page-v2/guide-page-v2';
import { ThemedArticlePageV2 } from 'site/content-types/themed-article-page-v2/themed-article-page-v2';
import { ToolsPageV2 } from 'site/content-types/tools-page-v2/tools-page-v2';
import { SituationPageV2 } from 'site/content-types/situation-page-v2/situation-page-v2';

type CustomContentDataConfigsWithoutDescriptor = {
    'animated-icons': AnimatedIcons;
    'area-page': AreaPage;
    calculator: Calculator;
    'contact-information': ContactInformation;
    'content-list': ContentList;
    'content-page-with-sidemenus': ContentPageWithSidemenus;
    'current-topic-page': CurrentTopicPage;
    'current-topic-page-v2': CurrentTopicPageV2;
    'dynamic-page': DynamicPage;
    'external-link': ExternalLink;
    'form-details': FormDetails;
    'form-intermediate-step': FormIntermediateStep;
    'forms-overview': FormsOverview;
    'fragment-creator': FragmentCreator;
    'front-page-nested': FrontPageNested;
    'front-page': FrontPage;
    'generic-page': GenericPage;
    'generic-page-v2': GenericPageV2;
    'global-case-time-set': GlobalCaseTimeSetData;
    'global-value-set': GlobalNumberValueSetData;
    'guide-page': GuidePage;
    'guide-page-v2': GuidePageV2;
    'internal-link': InternalLink;
    'large-table': LargeTable;
    'main-article-chapter': MainArticleChapter;
    'main-article': MainArticle;
    'megamenu-item': MegamenuItem;
    melding: Melding;
    'office-branch': OfficeBranch;
    'office-editorial-page': OfficeEditorialPage;
    'office-information': OfficeInformation;
    overview: Overview;
    'page-list': PageList;
    'page-meta': PageMeta;
    'payout-dates': PayoutDates;
    'press-landing-page': PressLandingPage;
    'product-details': ProductDetails;
    'product-page-v2': ProductPageV2;
    'publishing-calendar-entry': PublishingCalendarEntry;
    'publishing-calendar': PublishingCalendar;
    'redirects-folder': EmptyObject;
    'section-page': SectionPage;
    'situation-page': SituationPage;
    'situation-page-v2': SituationPageV2;
    'themed-article-page': ThemedArticlePage;
    'themed-article-page-v2': ThemedArticlePageV2;
    'tools-page': ToolsPage;
    'tools-page-v2': ToolsPageV2;
    'transport-page': TransportPage;
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
