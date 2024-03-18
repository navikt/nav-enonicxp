import { Component } from '/lib/xp/portal';
import { BaseMedia, Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { GlobalNumberValueSetData } from './global-value-set';
import { NavNoDescriptor } from '../common';
import { EmptyObject } from '../util-types';
import { GlobalCaseTimeSetData } from './global-case-time-set';
import {
    SearchConfigData,
    SearchConfigDescriptor,
    SearchExternalResourceData,
    SearchExternalResourceDescriptor,
} from './search-config';
import {
    AlertInContext,
    AnimatedIcons,
    AreaPage,
    Calculator,
    ContactInformation,
    ContentDataLocaleFallback,
    ContentList,
    ContentPageWithSidemenus,
    CurrentTopicPage,
    DynamicPage,
    ExternalLink,
    FormDetails,
    FormIntermediateStep,
    FormsOverview,
    FragmentCreator,
    FrontPage,
    FrontPageNested,
    GenericPage,
    GuidePage,
    InternalLink,
    LargeTable,
    MainArticle,
    MainArticleChapter,
    MegamenuItem,
    Melding,
    OfficeBranch,
    OfficeEditorialPage,
    OfficeInformation,
    Overview,
    PageList,
    PayoutDates,
    PressLandingPage,
    ProductDetails,
    PublishingCalendar,
    PublishingCalendarEntry,
    SearchConfigV2,
    SectionPage,
    SituationPage,
    ThemedArticlePage,
    ToolsPage,
    TransportPage,
    UserTestsConfig,
    Video,
} from 'site/content-types';

type CustomContentDataConfigsWithoutDescriptor = {
    'animated-icons': AnimatedIcons;
    'area-page': AreaPage;
    calculator: Calculator;
    'contact-information': ContactInformation;
    'content-list': ContentList;
    'content-page-with-sidemenus': ContentPageWithSidemenus;
    'dynamic-page': DynamicPage;
    'external-link': ExternalLink;
    'fragment-creator': FragmentCreator;
    'front-page': FrontPage;
    'front-page-nested': FrontPageNested;
    'global-case-time-set': GlobalCaseTimeSetData;
    'global-value-set': GlobalNumberValueSetData;
    'guide-page': GuidePage;
    'internal-link': InternalLink;
    'large-table': LargeTable;
    'content-data-locale-fallback': ContentDataLocaleFallback;
    'main-article': MainArticle;
    'main-article-chapter': MainArticleChapter;
    'megamenu-item': MegamenuItem;
    melding: Melding;
    'alert-in-context': AlertInContext;
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
    'search-config-v2': SearchConfigV2;
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
    'forms-overview': FormsOverview;
    'user-tests-config': UserTestsConfig;
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

export type ContentNode<ContentType extends ContentDescriptor = ContentDescriptor> = RepoNode<
    Content<ContentType>
>;

// TODO: add x-data
