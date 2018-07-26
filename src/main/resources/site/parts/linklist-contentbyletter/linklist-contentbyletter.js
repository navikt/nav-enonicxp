var thymeleafLib = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var view = resolve('linklist-contentbyletter.html');

function handleGet(req) {

    var letter = req.params.letter;
    var list = []
    if (letter) {
       list = content.getChildren({
            key: '7d54791c-aa4b-480c-acfd-80636054b309',
           start: 0,
           count: 10000
        }).hits.reduce(function (t, el) {
           if (el.data.heading.toLowerCase().startsWith(letter)) t.push({ heading: el.data.heading, url: portal.pageUrl({ id: el.data.link}) });
           return t;
       }, []);
    }




    var params = {
        list: list,
        hasList: list.length > 0
    };

    log.info(JSON.stringify(params));
    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
  <datasource name="getMenuBranch">
    <parameter name="menuItemKey">${portal.pageKey}</parameter>
    <parameter name="includeTopLevel">false</parameter>
    <paramater name="startLevel">1</paramater>
    <parameter name="levels">5</parameter>
  </datasource>
  <datasource name="getContentBySection">
    <parameter name="menuItemKeys">${param.id}</parameter>
    <parameter name="levels">2</parameter>
    <parameter name="query">title STARTS WITH '${param.letter}'</parameter>
    <parameter name="orderBy">title ASC</parameter>
    <parameter name="index">0</parameter>
    <parameter name="count">${select(param.count, 100)}</parameter>
    <parameter name="includeData">true</parameter>
    <parameter name="childrenLevel">0</parameter>
    <parameter name="parentLevel">0</parameter>
  </datasource>
</datasources>

*/
