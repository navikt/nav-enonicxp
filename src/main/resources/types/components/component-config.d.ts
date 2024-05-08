import { EmptyObject } from '../util-types';
import {
    AreapageSituations,
    Dynamic1Col,
    Dynamic2Col,
    Dynamic3Col,
    DynamicFlexCols,
    SectionWithHeader,
    SituationFlexCols,
} from '@xp-types/site/layouts';
import {
    AreapageSituationCard,
    Button,
    Calculator,
    ContactOption,
    DynamicAlert,
    DynamicHeader,
    DynamicLinkList,
    DynamicLinkPanel,
    DynamicNewsList,
    FiltersMenu,
    FormDetails,
    HtmlArea,
    PageHeader,
    PageNavigationMenu,
    ProductCard,
    ProductCardMicro,
    ProductCardMini,
    ProductDetails,
    ProviderCard,
    ReadMore,
} from '@xp-types/site/parts';

import { PageWithSideMenus } from '@xp-types/site/pages';

export type ComponentType = 'page' | 'layout' | 'part' | 'fragment';

type PageConfigs = {
    'page-with-side-menus': PageWithSideMenus;
};

type LayoutConfigs = {
    'dynamic-1-col': Dynamic1Col;
    'dynamic-2-col': Dynamic2Col;
    'dynamic-3-col': Dynamic3Col;
    'dynamic-flex-cols': DynamicFlexCols;
    'section-with-header': SectionWithHeader;
    'situation-flex-cols': SituationFlexCols;
    'areapage-situations': AreapageSituations;
};

export type PartConfigs = {
    'areapage-situation-card': AreapageSituationCard & { target: string };
    button: Button;
    calculator: Calculator;
    'contact-option': ContactOption;
    'dynamic-alert': DynamicAlert;
    'dynamic-header': DynamicHeader;
    'dynamic-link-list': DynamicLinkList;
    'dynamic-link-panel': DynamicLinkPanel;
    'dynamic-news-list': DynamicNewsList;
    'filters-menu': FiltersMenu;
    'form-details': FormDetails;
    'html-area': HtmlArea;
    'product-details': ProductDetails;
    'page-header': PageHeader;
    'page-navigation-menu': PageNavigationMenu;
    'product-card': ProductCard;
    'product-card-micro': ProductCardMicro;
    'product-card-mini': ProductCardMini;
    'provider-card': ProviderCard;
    'read-more': ReadMore;
};

export type ComponentConfigs = {
    page: PageConfigs;
    layout: LayoutConfigs;
    part: PartConfigs;
    fragment: EmptyObject;
};

type ConfigMapper<Type, Name> = Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type]
        ? ComponentConfigs[Type][Name]
        : never
    : never;

export type ComponentConfigAll = ConfigMapper<ComponentType, ComponentName>;

type PageComponentName = keyof ComponentConfigs['page'];
type LayoutComponentName = keyof ComponentConfigs['layout'];
type PartComponentName = keyof ComponentConfigs['part'];
export type ComponentName = PageComponentName | LayoutComponentName | PartComponentName;
