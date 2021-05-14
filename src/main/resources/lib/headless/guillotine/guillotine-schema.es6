const guillotineLib = require('/lib/guillotine');
const genericLib = require('/lib/guillotine/generic');
const dynamicLib = require('/lib/guillotine/dynamic');
const guillotineGraphQlLib = require('/lib/guillotine/graphql');
const rootQueryLib = require('/lib/guillotine/query/root-query');
const rootSubscriptionLib = require('/lib/guillotine/subscription/root-subscription');

const hookGenerateFormItemArguments = require('./function-hooks/generate-form-item-arguments');
const hookGenerateFormItemResolver = require('./function-hooks/generate-form-item-resolve-function');
const hookCreatePageComponentDataConfigType = require('./function-hooks/create-page-component-data-config-type');

const sectionPageDataCallback = require('./schema-creation-callbacks/section-page-data');
const { menuListDataCallback } = require('./schema-creation-callbacks/menu-list-data');
const contentListCallback = require('./schema-creation-callbacks/content-list-callback');
const largeTableCallback = require('./schema-creation-callbacks/large-table');
const { globalValuesCallback } = require('./schema-creation-callbacks/global-values');
const {
    filtersCategoryCallback,
    filtersMenuPartConfigCallback,
} = require('./schema-creation-callbacks/filters-menu');
const { contentListDataCallback } = require('./schema-creation-callbacks/content-list-data');
const { htmlAreaPartConfigCallback } = require('./schema-creation-callbacks/html-area-part-config');
const { pageNavigationMenuCallback } = require('./schema-creation-callbacks/page-navigation-menu');
const {
    mainArticleDataCallback,
    mainArticleCallback,
} = require('./schema-creation-callbacks/main-article');
const {
    mainArticleChapterCallback,
    mainArticleChapterDataCallback,
} = require('./schema-creation-callbacks/main-article-chapter');

const hookGuillotineFunctions = () => {
    hookGenerateFormItemArguments();
    hookGenerateFormItemResolver();
    hookCreatePageComponentDataConfigType();
};

const schemaContextOptions = {
    creationCallbacks: {
        no_nav_navno_MainArticle: mainArticleCallback,
        no_nav_navno_MainArticle_Data: mainArticleDataCallback,
        no_nav_navno_MainArticleChapter_Data: mainArticleChapterDataCallback,
        no_nav_navno_MainArticleChapter: mainArticleChapterCallback,
        no_nav_navno_LargeTable: largeTableCallback,
        no_nav_navno_SectionPage_Data: sectionPageDataCallback,
        no_nav_navno_ContentList_Data: contentListDataCallback,
        no_nav_navno_MainArticle_InnholdIHYremenyen: menuListDataCallback,
        no_nav_navno_PageList_InnholdIHYremenyen: menuListDataCallback,
        no_nav_navno_GlobalValueSet: globalValuesCallback,
        PartConfigDynamicNewsList_InnholdslisteForNyheter: contentListCallback('publish.first'),
        PartConfigDynamicLinkList_HentLenkerFraInnholdsliste: contentListCallback(),
        PartConfigPageNavigationMenu: pageNavigationMenuCallback,
        PageConfigPageWithSideMenus: pageNavigationMenuCallback,
        PartConfigHtmlArea: htmlAreaPartConfigCallback,
        PartConfigFiltersMenu: filtersMenuPartConfigCallback,
        PartConfigFiltersMenu_FilterKategori: filtersCategoryCallback,
    },
    applications: [app.name, 'navno.nav.no.search'],
};

const initAndCreateSchema = () => {
    hookGuillotineFunctions();

    const context = guillotineLib.createContext(schemaContextOptions);
    genericLib.createTypes(context);
    dynamicLib.createTypes(context);
    return guillotineGraphQlLib.createSchema({
        query: rootQueryLib.createRootQueryType(context),
        subscription: rootSubscriptionLib.createRootSubscriptionType(context),
        dictionary: context.dictionary,
    });
};

const schema = initAndCreateSchema();

module.exports = schema;
