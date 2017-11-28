var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var thymeleafLib = require('/lib/xp/thymeleaf');
var view = resolve('heronighanddaybanner.html');

function handleGet(req) {
    var h = new Date().getHours();
    var timeOfDay = h > 16 || h < 5 ? 'nighttime' : 'daytime';

    var content = portalLib.getContent();
    var queryResult = contentLib.query({
        start: 0,
        count: 2,
        filters: {
            ids: {
                values: [].concat(content.data.sectionContents || [])
            }
        },
        contentTypes: ["media:image"]
    });

    var count = queryResult.hits.length, imageContent = null;
    if (count === 1) {
        imageContent = queryResult.hits[0];
    } else if (count > 1) {
        sortSectionImages(queryResult.hits, content.data.sectionContents);
        imageContent = timeOfDay === 'nighttime' ? queryResult.hits[1] : queryResult.hits[0];
    }

    if (!imageContent) {
        return {
            status: 400
        }
    }

    var params = {
        imageWidth: imageContent.x.media.imageInfo.imageWidth,
        imageHeight: imageContent.x.media.imageInfo.imageHeight,
        imageDescription: imageContent.data.caption || '',
        imageId: imageContent._id,
        timeOfDay: timeOfDay
    };

    var body = thymeleafLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

function sortSectionImages(contents, ids) {
    var id1 = contents[0]._id;
    var id2 = contents[1]._id;
    var pos1 = ids.indexOf(id1);
    var pos2 = ids.indexOf(id2);
    if (pos1 > pos2) {
        var tmp = contents[0];
        contents[0] = contents[1];
        contents[1] = tmp;
    }
}

exports.get = handleGet;

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource name="getContentBySection" result-element="banner">
      <parameter name="menuItemKeys">${portal.pageKey}</parameter>
      <parameter name="levels">1</parameter>
      <parameter name="query">contenttype = 'Bilde'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">2</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
