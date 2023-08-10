import { macroHtmlFragmentCallback } from './schema-creation-callbacks/macro-html-fragment';
import { attachmentCallback } from './schema-creation-callbacks/attachment';
import { mediaCodeCallback, mediaImageCallback } from './schema-creation-callbacks/media';
import {
    internalLinkCallback,
    internalLinkDataCallback,
} from './schema-creation-callbacks/internal-link-callback';
import {
    mainArticleCallback,
    mainArticleDataCallback,
} from './schema-creation-callbacks/main-article';
import { sectionPageDataCallback } from './schema-creation-callbacks/section-page-data';
import { contentListDataCallback } from './schema-creation-callbacks/content-list-data';
import { partContactOptionChatCallback } from './schema-creation-callbacks/part-contact-option-chat';
import { menuListDataCallback } from './schema-creation-callbacks/menu-list-data';
import { globalValueSetCallback } from './schema-creation-callbacks/global-values';
import { globalValueCalculatorConfigCallback } from './schema-creation-callbacks/global-value-calculator-config';
import { contentListCallback } from './schema-creation-callbacks/content-list-callback';
import {
    anchorLinksCallback,
    pageNavigationMenuCallback,
} from './schema-creation-callbacks/page-navigation-menu';
import { filterCallback } from './schema-creation-callbacks/filters-menu';
import {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
} from './schema-creation-callbacks/global-value-macro-config';
import { macroAlertboxCallback } from './schema-creation-callbacks/macro-alert-box';
import { richTextCallback } from './schema-creation-callbacks/richtext';
import { overviewDataCallback } from './schema-creation-callbacks/overview-data-callback';
import { officeBranchCallback } from './schema-creation-callbacks/office-branch-callback';
import { formDetailsCallback } from './schema-creation-callbacks/form-details';
import { macroProductDetailsCallback } from './schema-creation-callbacks/macro-product-details';
import { fragmentComponentDataCallback } from './schema-creation-callbacks/fragment-component-data';
import { globalCaseTimeSetCallback } from './schema-creation-callbacks/global-case-time-set';
import { saksbehandlingstidMacroCallback } from './schema-creation-callbacks/saksbehandlingstid-macro-config';
import { areapageSituationCardPartCallback } from './schema-creation-callbacks/areapage-situation-card';
import { CreationCallback } from '../utils/creation-callback-utils';
import { contentInterfaceCallback } from './schema-creation-callbacks/content-interface';
import { externalLinkCallback } from './schema-creation-callbacks/external-link-callback';
import { microCardTargetPageCallback } from './schema-creation-callbacks/microcard-part';
import { createOpeningHoursFields } from './schema-creation-callbacks/common/opening-hours-mixin';
import { formsOverviewDataCallback } from './schema-creation-callbacks/forms-overview-data-callback';
import { audienceCallback } from './schema-creation-callbacks/common/audience-mixin';
import { pressLandingPageDataCallback } from './schema-creation-callbacks/press-landing-page-data';

export const schemaCreationCallbacks: { [key: string]: CreationCallback } = {
    Attachment: attachmentCallback,
    Content: contentInterfaceCallback,
    FragmentComponentData: fragmentComponentDataCallback,
    media_Code: mediaCodeCallback,
    media_Image: mediaImageCallback,
    no_nav_navno_ExternalLink: externalLinkCallback,
    no_nav_navno_FormsOverview_Data: formsOverviewDataCallback,
    no_nav_navno_InternalLink: internalLinkCallback,
    no_nav_navno_InternalLink_Data: internalLinkDataCallback,
    no_nav_navno_MainArticle: mainArticleCallback,
    no_nav_navno_MainArticle_Data: mainArticleDataCallback,
    no_nav_navno_SectionPage_Data: sectionPageDataCallback,
    no_nav_navno_ContentList_Data: contentListDataCallback,
    no_nav_navno_Overview_Data: overviewDataCallback,
    no_nav_navno_OfficeBranch: officeBranchCallback,
    no_nav_navno_ContactInformation_Chat: createOpeningHoursFields('chat'),
    no_nav_navno_ContactInformation_Telephone: createOpeningHoursFields('telephone'),
    no_nav_navno_MainArticle_MenuListItems: menuListDataCallback,
    no_nav_navno_PageList_MenuListItems: menuListDataCallback,
    no_nav_navno_GlobalValueSet: globalValueSetCallback,
    no_nav_navno_GlobalCaseTimeSet: globalCaseTimeSetCallback,
    no_nav_navno_Calculator_GlobalValue: globalValueCalculatorConfigCallback,
    no_nav_navno_PressLandingPage_Data: pressLandingPageDataCallback,
    Part_no_nav_navno_areapage_situation_card: areapageSituationCardPartCallback,
    Part_no_nav_navno_dynamic_news_list_ContentList: contentListCallback(
        'target',
        'numLinks',
        'publish.from'
    ),
    Part_no_nav_navno_dynamic_link_list_ContentList: contentListCallback('target', 'numLinks'),
    Part_no_nav_navno_contact_option_Chat: partContactOptionChatCallback,
    Part_no_nav_navno_frontpage_current_topics: contentListCallback('contentList', 'maxItems'),
    Part_no_nav_navno_page_navigation_menu: pageNavigationMenuCallback,
    Part_no_nav_navno_page_navigation_menu_AnchorLinks: anchorLinksCallback,
    Page_no_nav_navno_page_with_side_menus: pageNavigationMenuCallback,
    Page_no_nav_navno_page_with_side_menus_AnchorLinks: anchorLinksCallback,
    Part_no_nav_navno_product_card_micro_CardList: microCardTargetPageCallback,
    Part_no_nav_navno_filters_menu_Filters: filterCallback,
    Part_no_nav_navno_form_details: formDetailsCallback,
    Macro_no_nav_navno_saksbehandlingstid_DataConfig: saksbehandlingstidMacroCallback,
    Macro_no_nav_navno_global_value_DataConfig: globalValueMacroConfigCallback,
    Macro_no_nav_navno_global_value_with_math_DataConfig: globalValueWithMathMacroConfigCallback,
    Macro_no_nav_navno_html_fragment_DataConfig: macroHtmlFragmentCallback,
    Macro_no_nav_navno_form_details_DataConfig: formDetailsCallback,
    Macro_no_nav_navno_product_details_DataConfig: macroProductDetailsCallback,
    Macro_no_nav_navno_alert_box_DataConfig: macroAlertboxCallback,
    RichText: richTextCallback,
    no_nav_navno_AreaPage_Audience: audienceCallback,
    no_nav_navno_CurrentTopicPage_Audience: audienceCallback,
    no_nav_navno_FrontPage_Audience: audienceCallback,
    no_nav_navno_SituationPage_Audience: audienceCallback,
    no_nav_navno_GenericPage_Audience: audienceCallback,
    no_nav_navno_ContentPageWithSidemenus_Audience: audienceCallback,
    no_nav_navno_ThemedArticlePage_Audience: audienceCallback,
    no_nav_navno_ToolsPage_Audience: audienceCallback,
    no_nav_navno_GuidePage_Audience: audienceCallback,
};
