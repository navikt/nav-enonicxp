import { GlobalValueSetData } from './global-value-set';
import { Component } from '/lib/xp/portal';
import { AnimatedIcons } from '../../site/content-types/animated-icons/animated-icons';
import { Calculator } from '../../site/content-types/calculator/calculator';
import { ContentList } from '../../site/content-types/content-list/content-list';
import { ContentPageWithSidemenus } from '../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';
import { DynamicPage } from '../../site/content-types/dynamic-page/dynamic-page';
import { EmployerSituationPage } from '../../site/content-types/employer-situation-page/employer-situation-page';
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
import { PublishingCalendar } from '../../site/content-types/publishing-calendar/publishing-calendar';
import { SectionPage } from '../../site/content-types/section-page/section-page';
import { SituationPage } from '../../site/content-types/situation-page/situation-page';
import { ToolsPage } from '../../site/content-types/tools-page/tools-page';
import { TransportPage } from '../../site/content-types/transport-page/transport-page';
import { NavNoDescriptor } from '../common';
import { EmptyObject } from '../util-types';
import { ContactInformation } from '../../site/content-types/contact-information/contact-information';

type CustomContentDataConfigsWithoutDescriptor = {
    'animated-icons': AnimatedIcons;
    calculator: Calculator;
    'contact-information': ContactInformation;
    'content-list': ContentList;
    'content-page-with-sidemenus': ContentPageWithSidemenus;
    'dynamic-page': DynamicPage;
    'employer-situation-page': EmployerSituationPage;
    'external-link': ExternalLink;
    'global-value-set': GlobalValueSetData;
    'guide-page': GuidePage;
    'themed-article-page': ThemedArticlePage;
    'internal-link': InternalLink;
    'large-table': LargeTable;
    'main-article': MainArticle;
    'main-article-chapter': MainArticleChapter;
    'megamenu-item': MegamenuItem;
    melding: Melding;
    notifications: Notification;
    'office-information': OfficeInformation;
    'page-list': PageList;
    'publishing-calendar': PublishingCalendar;
    'section-page': SectionPage;
    'situation-page': SituationPage;
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
      }
    : never;

export type BuiltinContentDescriptor = 'portal:fragment';
// | 'portal:template-folder'
// | 'portal:page-template'
// | 'portal:site';

export type CustomContentName = keyof CustomContentDataConfigsWithoutDescriptor;

export type CustomContentDescriptor = keyof CustomContentDataConfigs;

export type ContentDescriptor = CustomContentDescriptor | BuiltinContentDescriptor;

// TODO: add x-data
// TODO: add media/portal/base types
