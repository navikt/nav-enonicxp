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
const menuListDataCallback = require('./schema-creation-callbacks/menu-list-data');
const contentListCallback = require('./schema-creation-callbacks/content-list-callback');

const { sortByLastModifiedDesc } = require('/lib/headless/sort');

const hookGuillotineFunctions = () => {
    hookGenerateFormItemArguments();
    hookGenerateFormItemResolver();
    hookCreatePageComponentDataConfigType();
};

const schemaContextOptions = {
    creationCallbacks: {
        no_nav_navno_SectionPage_Data: sectionPageDataCallback,
        no_nav_navno_MainArticle_InnholdIHYremenyen: menuListDataCallback,
        no_nav_navno_PageList_InnholdIHYremenyen: menuListDataCallback,
        PartConfigDynamicNewsList_InnholdslisteForNyheter: contentListCallback(
            sortByLastModifiedDesc
        ),
        PartConfigDynamicLinkList_HentLenkerFraInnholdsliste: contentListCallback(),
    },
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
