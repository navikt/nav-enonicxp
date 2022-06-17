import { PageWithSideMenusPageConfig } from '../../site/pages/page-with-side-menus/page-with-side-menus-page-config';
import { Dynamic1ColConfig } from '../../site/layouts/dynamic-1-col/dynamic-1-col-config';
import { Dynamic2ColConfig } from '../../site/layouts/dynamic-2-col/dynamic-2-col-config';
import { Dynamic3ColConfig } from '../../site/layouts/dynamic-3-col/dynamic-3-col-config';
import { Dynamic4ColConfig } from '../../site/layouts/dynamic-4-col/dynamic-4-col-config';
import { DynamicFlexColsConfig } from '../../site/layouts/dynamic-flex-cols/dynamic-flex-cols-config';
import { SectionWithHeaderConfig } from '../../site/layouts/section-with-header/section-with-header-config';
import { SituationFlexColsConfig } from '../../site/layouts/situation-flex-cols/situation-flex-cols-config';
import { ButtonPartConfig } from '../../site/parts/button/button-part-config';
import { CalculatorPartConfig } from '../../site/parts/calculator/calculator-part-config';
import { ContactOptionPartConfig } from '../../site/parts/contact-option/contact-option-part-config';
import { DynamicAlertPartConfig } from '../../site/parts/dynamic-alert/dynamic-alert-part-config';
import { DynamicHeaderPartConfig } from '../../site/parts/dynamic-header/dynamic-header-part-config';
import { DynamicLinkListPartConfig } from '../../site/parts/dynamic-link-list/dynamic-link-list-part-config';
import { DynamicLinkPanelPartConfig } from '../../site/parts/dynamic-link-panel/dynamic-link-panel-part-config';
import { DynamicNewsListPartConfig } from '../../site/parts/dynamic-news-list/dynamic-news-list-part-config';
import { FiltersMenuPartConfig } from '../../site/parts/filters-menu/filters-menu-part-config';
import { HtmlAreaPartConfig } from '../../site/parts/html-area/html-area-part-config';
import { ProductDetailsPartConfig } from '../../site/parts/product-details/product-details-part-config';
import { PageHeaderPartConfig } from '../../site/parts/page-header/page-header-part-config';
import { PageNavigationMenuPartConfig } from '../../site/parts/page-navigation-menu/page-navigation-menu-part-config';
import { ProductCardPartConfig } from '../../site/parts/product-card/product-card-part-config';
import { ProductCardMicroPartConfig } from '../../site/parts/product-card-micro/product-card-micro-part-config';
import { ProductCardMiniPartConfig } from '../../site/parts/product-card-mini/product-card-mini-part-config';
import { ProviderCardPartConfig } from '../../site/parts/provider-card/provider-card-part-config';
import { AreapageSituationsConfig } from '../../site/layouts/areapage-situations/areapage-situations-config';
import { AreapageSituationCardPartConfig } from '../../site/parts/areapage-situation-card/areapage-situation-card-part-config';
import { EmptyObject } from '../util-types';

export type ComponentType = 'page' | 'layout' | 'part' | 'fragment';
// | 'text';

type PageConfigs = {
    'page-with-side-menus': PageWithSideMenusPageConfig;
};

type LayoutConfigs = {
    'dynamic-1-col': Dynamic1ColConfig;
    'dynamic-2-col': Dynamic2ColConfig;
    'dynamic-3-col': Dynamic3ColConfig;
    'dynamic-4-col': Dynamic4ColConfig;
    'dynamic-flex-cols': DynamicFlexColsConfig;
    'section-with-header': SectionWithHeaderConfig;
    'situation-flex-cols': SituationFlexColsConfig;
    'areapage-situations': AreapageSituationsConfig;
};

type PartConfigs = {
    'areapage-situation-card': AreapageSituationCardPartConfig;
    button: ButtonPartConfig;
    calculator: CalculatorPartConfig;
    'contact-option': ContactOptionPartConfig;
    'dynamic-alert': DynamicAlertPartConfig;
    'dynamic-header': DynamicHeaderPartConfig;
    'dynamic-link-list': DynamicLinkListPartConfig;
    'dynamic-link-panel': DynamicLinkPanelPartConfig;
    'dynamic-news-list': DynamicNewsListPartConfig;
    'filters-menu': FiltersMenuPartConfig;
    'html-area': HtmlAreaPartConfig;
    'product-details': ProductDetailsPartConfig;
    'page-header': PageHeaderPartConfig;
    'page-navigation-menu': PageNavigationMenuPartConfig;
    'product-card': ProductCardPartConfig;
    'product-card-micro': ProductCardMicroPartConfig;
    'product-card-mini': ProductCardMiniPartConfig;
    'provider-card': ProviderCardPartConfig;
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

// TODO: add text components?
