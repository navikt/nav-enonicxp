var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var thymeleafLib = require('/lib/thymeleaf');
var utils = require('/lib/nav-utils');
var libs = {
	util: require('/lib/enonic/util')
}

var view = resolve('heronighanddaybanner.html');

/* This is displayed on nav.no/no/Person and alternates between two images depending on the time of day. */


function handleGet(req) {

    var h = new Date().getHours();
    var timeOfDay = h > 16 || h < 5 ? 'nighttime' : 'daytime';

    var content = portalLib.getContent();
    var queryResult = contentLib.getChildren({
        key: content._id
    }).hits.reduce(function(t,el) {
        if (el.type === 'media:image') t.push(el)
        return t;
    },[]);
   // checkImage(queryResult.hits[0]);
    //log.info(content._path);
    //log.info(JSON.stringify(queryResult));
    var count = queryResult.length, imageContent = null;
    if (count === 1) {
        imageContent = queryResult[0];
    } else if (count > 1) {
        var sortedContents = queryResult;
        imageContent = timeOfDay === 'nighttime' ? sortedContents[1] : sortedContents[0];
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
