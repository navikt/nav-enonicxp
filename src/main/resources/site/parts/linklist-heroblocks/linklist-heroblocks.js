var libs = {
    portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
    skjema: require('/lib/skjema'),
	util: require('/lib/enonic/util')
};

var appPath = libs.util.app.getJsonName();
var view = resolve('linklist-heroblocks.html');



/**
 * Gets the links to be listed beneath a hero block (a submenu for further navigation through the Skjemaveileder steps)
 * @param  {Object} content Content object with children that are menuitems
 * @return {[Object]}       Array of link objects, each containing 'title' and 'url'
 */
function getLinkList (content) {
    var linkList = [];

    var menuitemChildrenNotFolders = libs.content.query({
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: '_parentPath',
                            values: [ '/content' + content._path ]
                        }
                    },
                    {
                        hasValue: {
                            field: 'x.' + appPath + '.menu-item.menuItem',
                            values: [ 'true' ]
                        }
                    }
                ],
                mustNot: {
                    hasValue: {
                        field: 'type',
                        values: [ 'base:folder' ]
                    }
                }
            }
        },
        sort: '_manualOrderValue DESC'
    });

    if (menuitemChildrenNotFolders.hits.length) {
        linkList = menuitemChildrenNotFolders.hits.map(function (menuitem) {
            return {
                title: libs.skjema.getMenuitemName(menuitem),
                url: libs.portal.pageUrl({
                    id: menuitem._id
                })
            }
        });
    }

    return linkList.length ? linkList : null;
}


/**
 * Emulates CMS datasource from portlet "Skjema 1: hovedinnganger (privat | bedrift | etc)":
 * <datasources>
     <datasource name="getSubMenu" result-element="maincat">
       <parameter name="menuItemKey">${portal.pageKey}</parameter>
       <parameter name="tagItem">${select(param.id,-1)}</parameter>
       <parameter name="levels">2</parameter>
     </datasource>
   </datasources>
 */
function getMainCatHeroBlocks (content) {
    var heroBlocks = [];

    var contentTitle = libs.skjema.getMenuitemName(content);
    var contentIcon = libs.skjema.getParamFromContentByName(content, 'icon');

    // Add hero block and link list
    if (contentTitle) {
        heroBlocks = [{
            title: contentTitle,
            icon: contentIcon,
            linkList: getLinkList(content)
        }];
    }

    return heroBlocks.length ? heroBlocks : null;
}



/**
 * Emulates CMS datasource from portlet "Skjema 2: Velg emne":
 * <datasources>
     <datasource name="getMenuBranch" result-element="subcat">
       <parameter name="menuItemKey">${portal.pageKey}</parameter>
       <parameter name="includeTopLevel">true</parameter>
       <paramater name="startLevel">4</paramater>
       <parameter name="levels">2</parameter>
     </datasource>
   </datasources>
 */
function getSubCatHeroBlocks (content) {
    var heroBlocks = [];

    var menuitemChildrenNotExcludedFromMenu = libs.content.query({
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: '_parentPath',
                            values: [ '/content' + content._path ]
                        }
                    },
                    {
                        hasValue: {
                            field: 'x.' + appPath + '.menu-item.menuItem',
                            values: [ 'true' ]
                        }
                    }
                ],
                mustNot: {
                    hasValue: {
                        field: 'data.parameters.name',
                        values: [ 'exclude-from-mainmenu' ]
                    }
                }
            }
        },
        sort: '_manualOrderValue DESC'
    });
    if (menuitemChildrenNotExcludedFromMenu.hits.length) {
        heroBlocks = menuitemChildrenNotExcludedFromMenu.hits.map(function (menuitem) {
            return {
                title: libs.skjema.getMenuitemName(menuitem),
                icon: libs.skjema.getParamFromContentByName(menuitem, 'icon'),
                linkList: getLinkList(menuitem)
            }
        });
    }

    return heroBlocks.length ? heroBlocks : null;
}



/**
 * Gets content of type shortcut or url from beneath a content of type label which is beneath the content given as a parameter
 * @param {Object} content Content object
 * @returns {string} Name of menu item content, defaults to displayName.
 */
function getHorizontalShortcuts (content) {
    var shortcuts = [];

    var folderChildrenInMenu = libs.content.query({
        contentTypes: ['base:folder'],
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: '_parentPath',
                            values: [ '/content' + content._path ]
                        }
                    },
                    {
                        hasValue: {
                            field: 'x.' + appPath + '.menu-item.menuItem',
                            values: [ 'true' ]
                        }
                    }
                ]
            }
        },
        sort: '_manualOrderValue DESC'
    });

    if (folderChildrenInMenu.hits.length) {
        folderChildrenInMenu.hits.forEach(function (folder) {
            var menuitemsInFolder = libs.content.query({
                contentTypes: ['base:shortcut', app.name + ':url'],
                filters: {
                    boolean: {
                        must: [
                            {
                                hasValue: {
                                    field: '_parentPath',
                                    values: [ '/content' + folder._path ]
                                }
                            },
                            {
                                hasValue: {
                                    field: 'x.' + appPath + '.menu-item.menuItem',
                                    values: [ 'true' ]
                                }
                            }
                        ]
                    }
                },
                sort: '_manualOrderValue DESC'
            });

            if (menuitemsInFolder.hits.length) {
                shortcuts = menuitemsInFolder.hits.map(function (menuitem) {

                    var url = '';
                    if (menuitem.data.target) {
                        url = libs.portal.pageUrl({
                            id: menuitem.data.target
                        });
                    } else if (menuitem.data.url) {
                        url = menuitem.data.url;
                    }

                    return {
                        url: url,
                        displayName: menuitem.displayName
                    }
                });
            }
        });
    }

    return shortcuts.length ? shortcuts : null;
};



/**
 * Creates an HTML response to the GET request on page load
 * @param  {Object} request GET request
 * @return {Object}
 */
function handleGet(request) {
    var content = libs.portal.getContent();
    var site = libs.portal.getSite();
    var component = libs.portal.getComponent();
    var config = component.config;

    var veilederTypeForSok = libs.skjema.getValidParamFromRequestByName(request, 'veiledertype');

    // We need to determine if the response is for Skjema 1 or Skjema 2.
    // All CMS menuitems for Skjema 2 have a menuitem parameter 'veiledertype' present. This is not the case for Skjema 1.
    // It's also possible to differentiate Skjema 1 and Skjema 2 by examining what page tempalte the current content is using,
    // …but since the param is already there on all relevant menuitems, it's faster and simpler just to check for a param instead of doing a content query
    var isSkjema2 = veilederTypeForSok ? true : false;

    // Default search result page
    var sokeresultatside = libs.portal.pageUrl({
        path: site._path + '/no/Person/Skjemaer-for-privatpersoner/Skjemaer/Sokeresultater'
    });

    // Set search result page from part config, if available
    var sokeresultatsideFromConfig = null;
    if (veilederTypeForSok == 'privatperson_ettersendelse' && config['sokeresultatside_for_privatperson_ettersendelse']) {
        sokeresultatsideFromConfig = config['sokeresultatside_for_privatperson_ettersendelse'];
    } else if (veilederTypeForSok == 'arbeidsgiver' && config['sokeresultatside_for_arbeid']) {
        sokeresultatsideFromConfig = config['sokeresultatside_for_arbeid'];
    } else if (veilederTypeForSok == 'arbeidsgiver_ettersendelse' && config['sokeresultatside_for_arbeid_ettersendelse']) {
        sokeresultatsideFromConfig = config['sokeresultatside_for_arbeid_ettersendelse'];
    } else if (config['sokeresultatside_for_privatperson']) {
        sokeresultatsideFromConfig = config['sokeresultatside_for_privatperson'];
    }
    if (sokeresultatsideFromConfig) {
        sokeresultatside = libs.portal.pageUrl({
            id: sokeresultatsideFromConfig
        });
    }

    // Add hero blocks depending on if mode is Skjema 1 or Skjema 2
    var heroBlocks = [];
    if (isSkjema2) {
        heroBlocks = getSubCatHeroBlocks(content);
    } else {
        heroBlocks = getMainCatHeroBlocks(content);
    }

    var horizontalShortcuts = getHorizontalShortcuts(content);

    // Flexmode is a CSS class for the view
    var flexMode = 'multiple';
    if (heroBlocks.length == 1) flexMode = 'single';
    if (heroBlocks.length == 2) flexMode = 'pair';

    var model = {
        isEditMode: (request.mode === 'edit'),
        veilederTypeForSok: veilederTypeForSok,
        sokeresultatside: sokeresultatside,
        q: libs.skjema.getValidParamFromRequestByName(request, 'q'),
        heroBlocks: heroBlocks,
        horizontalShortcuts: horizontalShortcuts,
        flexMode: flexMode,
        includeEqualHeightJS: (heroBlocks.length != 1)
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model)
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

 Skjema 1: hovedinnganger (privat | bedrift | etc)
 <datasources>
   <datasource name="getSubMenu" result-element="maincat">
     <parameter name="menuItemKey">${portal.pageKey}</parameter>
     <parameter name="tagItem">${select(param.id,-1)}</parameter>
     <parameter name="levels">2</parameter>
   </datasource>
 </datasources>

 Skjema 2: Velg emne
 <datasources>
   <datasource name="getMenuBranch" result-element="subcat">
     <parameter name="menuItemKey">${portal.pageKey}</parameter>
     <parameter name="includeTopLevel">true</parameter>
     <paramater name="startLevel">4</paramater>
     <parameter name="levels">2</parameter>
   </datasource>
 </datasources>
*/
