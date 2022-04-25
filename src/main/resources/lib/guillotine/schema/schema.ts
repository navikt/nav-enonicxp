import guillotineLib from '/lib/guillotine';
import { redirectsRootPath } from '../../constants';
import { contentListCallback } from './schema-creation-callbacks/content-list-callback';
import { attachmentCallback } from './schema-creation-callbacks/attachment';
import { mediaCodeCallback, mediaImageCallback } from './schema-creation-callbacks/media';
import { sectionPageDataCallback } from './schema-creation-callbacks/section-page-data';
import { richTextCallback } from './schema-creation-callbacks/richtext';
import { contentListDataCallback } from './schema-creation-callbacks/content-list-data';
import { contactInformationCallback } from './schema-creation-callbacks/contact-information';
import { filterCallback } from './schema-creation-callbacks/filters-menu';
import { globalValueCalculatorConfigCallback } from './schema-creation-callbacks/global-value-calculator-config';
import {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
} from './schema-creation-callbacks/global-value-macro-config';
import { globalValuesCallback } from './schema-creation-callbacks/global-values';
import { macroAlertboxCallback } from './schema-creation-callbacks/macro-alert-box';
import {
    applyMacroCreationCallbacksToHtmlFragmentTypes,
    macroHtmlFragmentCallback,
} from './schema-creation-callbacks/macro-html-fragment';
import {
    mainArticleCallback,
    mainArticleDataCallback,
} from './schema-creation-callbacks/main-article';
import {
    mainArticleChapterCallback,
    mainArticleChapterDataCallback,
} from './schema-creation-callbacks/main-article-chapter';
import { menuListDataCallback } from './schema-creation-callbacks/menu-list-data';

const { pageNavigationMenuCallback } = require('./schema-creation-callbacks/page-navigation-menu');

const schemaContextOptions = {
    creationCallbacks: applyMacroCreationCallbacksToHtmlFragmentTypes({
        Attachment: attachmentCallback,
        media_Code: mediaCodeCallback,
        media_Image: mediaImageCallback,
        no_nav_navno_MainArticle: mainArticleCallback,
        no_nav_navno_MainArticle_Data: mainArticleDataCallback,
        no_nav_navno_MainArticleChapter_Data: mainArticleChapterDataCallback,
        no_nav_navno_MainArticleChapter: mainArticleChapterCallback,
        no_nav_navno_SectionPage_Data: sectionPageDataCallback,
        no_nav_navno_ContentList_Data: contentListDataCallback,
        no_nav_navno_ContactInformation_Telefonnummer: contactInformationCallback,
        no_nav_navno_MainArticle_InnholdIHoyremenyen: menuListDataCallback,
        no_nav_navno_PageList_InnholdIHoyremenyen: menuListDataCallback,
        no_nav_navno_GlobalValueSet: globalValuesCallback,
        no_nav_navno_Calculator_GlobalVerdi: globalValueCalculatorConfigCallback,
        Part_no_nav_navno_dynamic_news_list_InnholdslisteForNyheter:
            contentListCallback('publish.first'),
        Part_no_nav_navno_dynamic_link_list_HentLenkerFraInnholdsliste: contentListCallback(),
        Part_no_nav_navno_page_navigation_menu: pageNavigationMenuCallback,
        Page_no_nav_navno_page_with_side_menus: pageNavigationMenuCallback,
        Part_no_nav_navno_filters_menu_Filter: filterCallback,
        Macro_no_nav_navno_global_value_DataConfig: globalValueMacroConfigCallback,
        Macro_no_nav_navno_global_value_with_math_DataConfig:
            globalValueWithMathMacroConfigCallback,
        Macro_no_nav_navno_html_fragment_DataConfig: macroHtmlFragmentCallback,
        Macro_no_nav_navno_alert_box_DataConfig: macroAlertboxCallback,
        RichText: richTextCallback,
    }),
    applications: [app.name, 'navno.nav.no.search'],
    allowPaths: [redirectsRootPath],
};

const initAndCreateSchema = () => {
    return guillotineLib.createSchema(schemaContextOptions);
};

export const schema = initAndCreateSchema();
