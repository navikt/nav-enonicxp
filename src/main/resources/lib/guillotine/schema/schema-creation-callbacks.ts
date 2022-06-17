import { macroHtmlFragmentCallback } from './schema-creation-callbacks/macro-html-fragment';
import { attachmentCallback } from './schema-creation-callbacks/attachment';
import { mediaCodeCallback, mediaImageCallback } from './schema-creation-callbacks/media';
import {
    mainArticleCallback,
    mainArticleDataCallback,
} from './schema-creation-callbacks/main-article';
import {
    mainArticleChapterCallback,
    mainArticleChapterDataCallback,
} from './schema-creation-callbacks/main-article-chapter';
import { sectionPageDataCallback } from './schema-creation-callbacks/section-page-data';
import { contentListDataCallback } from './schema-creation-callbacks/content-list-data';
import { contactInformationCallback } from './schema-creation-callbacks/contact-information';
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
import { overviewCallback } from './schema-creation-callbacks/overview-callback';
import { fragmentComponentDataCallback } from './schema-creation-callbacks/fragment-component-data';
import { globalCaseTimeSetCallback } from './schema-creation-callbacks/global-case-time-set';
import { saksbehandlingstidMacroCallback } from './schema-creation-callbacks/saksbehandlingstid-macro-config';
import { areapageSituationCardPartCallback } from './schema-creation-callbacks/areapage-situation-card';

export const schemaCreationCallbacks = {
    Attachment: attachmentCallback,
    FragmentComponentData: fragmentComponentDataCallback,
    media_Code: mediaCodeCallback,
    media_Image: mediaImageCallback,
    no_nav_navno_MainArticle: mainArticleCallback,
    no_nav_navno_MainArticle_Data: mainArticleDataCallback,
    no_nav_navno_MainArticleChapter_Data: mainArticleChapterDataCallback,
    no_nav_navno_MainArticleChapter: mainArticleChapterCallback,
    no_nav_navno_SectionPage_Data: sectionPageDataCallback,
    no_nav_navno_ContentList_Data: contentListDataCallback,
    no_nav_navno_Overview_Data: overviewCallback,
    no_nav_navno_ContactInformation_Telefonnummer: contactInformationCallback,
    no_nav_navno_MainArticle_InnholdIHoyremenyen: menuListDataCallback,
    no_nav_navno_PageList_InnholdIHoyremenyen: menuListDataCallback,
    no_nav_navno_GlobalValueSet: globalValueSetCallback,
    no_nav_navno_GlobalCaseTimeSet: globalCaseTimeSetCallback,
    no_nav_navno_Calculator_GlobalVerdi: globalValueCalculatorConfigCallback,
    Part_no_nav_navno_areapage_situation_card: areapageSituationCardPartCallback,
    Part_no_nav_navno_dynamic_news_list_InnholdslisteForNyheter:
        contentListCallback('publish.first'),
    Part_no_nav_navno_dynamic_link_list_HentLenkerFraInnholdsliste: contentListCallback(),
    Part_no_nav_navno_page_navigation_menu: pageNavigationMenuCallback,
    Part_no_nav_navno_page_navigation_menu_OverstyrLenketekster: anchorLinksCallback,
    Page_no_nav_navno_page_with_side_menus: pageNavigationMenuCallback,
    Page_no_nav_navno_page_with_side_menus_OverstyrLenketekster: anchorLinksCallback,
    Part_no_nav_navno_filters_menu_Filter: filterCallback,
    Macro_no_nav_navno_saksbehandlingstid_DataConfig: saksbehandlingstidMacroCallback,
    Macro_no_nav_navno_global_value_DataConfig: globalValueMacroConfigCallback,
    Macro_no_nav_navno_global_value_with_math_DataConfig: globalValueWithMathMacroConfigCallback,
    Macro_no_nav_navno_html_fragment_DataConfig: macroHtmlFragmentCallback,
    Macro_no_nav_navno_alert_box_DataConfig: macroAlertboxCallback,
    RichText: richTextCallback,
};
