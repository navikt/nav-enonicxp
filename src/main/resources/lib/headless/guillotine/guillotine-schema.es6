const guillotineLib = require('/lib/guillotine');
const genericLib = require('/lib/guillotine/generic');
const dynamicLib = require('/lib/guillotine/dynamic');
const rootQueryLib = require('/lib/guillotine/query/root-query');
const rootSubscriptionLib = require('/lib/guillotine/subscription/root-subscription');

const sectionPageDataCallback = require('./schema-creation-callbacks/section-page-data');
const { menuListDataCallback } = require('./schema-creation-callbacks/menu-list-data');
const contentListCallback = require('./schema-creation-callbacks/content-list-callback');
const { mediaCodeCallback } = require('./schema-creation-callbacks/media');
const { attachmentCallback } = require('./schema-creation-callbacks/attachment');
const { macroHtmlFragmentCallback } = require('./schema-creation-callbacks/macro-html-fragment');
const { filterCallback } = require('./schema-creation-callbacks/filters-menu');
const {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
} = require('./schema-creation-callbacks/global-value-macro-config');
const {
    globalValueCalculatorConfigCallback,
} = require('./schema-creation-callbacks/global-value-calculator-config');
const { globalValueDataCallback } = require('./schema-creation-callbacks/global-values');
const { contentListDataCallback } = require('./schema-creation-callbacks/content-list-data');
const { pageNavigationMenuCallback } = require('./schema-creation-callbacks/page-navigation-menu');
const {
    mainArticleDataCallback,
    mainArticleCallback,
} = require('./schema-creation-callbacks/main-article');
const {
    mainArticleChapterCallback,
    mainArticleChapterDataCallback,
} = require('./schema-creation-callbacks/main-article-chapter');
const {
    applyMacroCreationCallbacksToHtmlFragmentTypes,
} = require('/lib/headless/guillotine/schema-creation-callbacks/macro-html-fragment');

const schemaContextOptions = {
    creationCallbacks: applyMacroCreationCallbacksToHtmlFragmentTypes({
        Attachment: attachmentCallback,
        media_Code: mediaCodeCallback,
        no_nav_navno_MainArticle: mainArticleCallback,
        no_nav_navno_MainArticle_Data: mainArticleDataCallback,
        no_nav_navno_MainArticleChapter_Data: mainArticleChapterDataCallback,
        no_nav_navno_MainArticleChapter: mainArticleChapterCallback,
        no_nav_navno_SectionPage_Data: sectionPageDataCallback,
        no_nav_navno_ContentList_Data: contentListDataCallback,
        no_nav_navno_MainArticle_InnholdIHoyremenyen: menuListDataCallback,
        no_nav_navno_PageList_InnholdIHoyremenyen: menuListDataCallback,
        no_nav_navno_GlobalValueSet_Data: globalValueDataCallback,
        no_nav_navno_Calculator_GlobalVerdi: globalValueCalculatorConfigCallback,
        Part_no_nav_navno_dynamic_news_list_InnholdslisteForNyheter: contentListCallback(
            'publish.first'
        ),
        Part_no_nav_navno_dynamic_link_list_HentLenkerFraInnholdsliste: contentListCallback(),
        Part_no_nav_navno_page_navigation_menu: pageNavigationMenuCallback,
        Page_no_nav_navno_page_with_side_menus: pageNavigationMenuCallback,
        Part_no_nav_navno_filters_menu_Filter: filterCallback,
        Macro_no_nav_navno_global_value_DataConfig: globalValueMacroConfigCallback,
        Macro_no_nav_navno_global_value_with_math_DataConfig: globalValueWithMathMacroConfigCallback,
        Macro_no_nav_navno_html_fragment_DataConfig: macroHtmlFragmentCallback,
    }),
    applications: [app.name, 'navno.nav.no.search', 'com.enonic.app.rss'],
    allowPaths: ['/redirects'],
};

const initAndCreateSchema = () => {
    const context = guillotineLib.createContext(schemaContextOptions);
    genericLib.createTypes(context);
    dynamicLib.createTypes(context);

    return context.schemaGenerator.createSchema({
        query: rootQueryLib.createRootQueryType(context),
        subscription: rootSubscriptionLib.createRootSubscriptionType(context),
        dictionary: context.dictionary,
    });
};

const schema = initAndCreateSchema();

module.exports = schema;
