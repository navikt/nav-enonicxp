var thymeleafLib = require('/lib/thymeleaf');
var view = resolve('skjemaveileder-privatperson-engelsk-formgenerator.html');

function handleGet(req) {

    var params = {
        partName: "skjemaveileder-privatperson-engelsk-formgenerator"
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
    <datasource name="getContent">
      <parameter name="contentKeys">${select(param.key, 0)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">3</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection" result-element="schematext">
      <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'Skjemaveileder_privatperson_txt'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
    <datasource name="getContentBySection" result-element="helptext">
      <parameter name="menuItemKeys">${select(param.id, '-1')}</parameter>
      <parameter name="levels">0</parameter>
      <parameter name="query">contenttype = 'Skjemaveileder_hjelpetekster'</parameter>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">0</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/
