var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var trans = require('/lib/contentTranslator');
var utils = require('/lib/nav-utils');
var cache = require('/lib/cacheControll');
// Resolve the view
var view = resolve('tavleliste.html');

exports.get = function(req) {
  return cache.getPaths('tavleliste' + req.path, function() {
    var cont = portal.getContent();
    var ids = cont.data.sectionContents;
    ids = !Array.isArray(ids) ? [ids] : ids;
    var items = ids
      .map(function(value) {
        return content.get({ key: value });
      })
      .reduce(function(t, el) {
        if (el) t.push(el);
        return t;
      }, [])
      .concat(content.getChildren({ key: cont._id }).hits)
      .map(function(el) {
        return {
          src: portal.pageUrl({ id: el._id }),
          heading: el.displayName,
          ingress: el.data.ingress,
          publishedText: utils.dateTimePublished(el, el.language || 'no'),
          published: el.publish && el.publish.first ? el.publish.first : el.createdTime
        };
      })
      .reduce(function(t, el) {
        if (
          !t.reduce(function(to, ele) {
            return to || ele.src === el.src;
          }, false)
        )
          t.push(el);
        return t;
      }, []);

    if (cont.data.orderSectionContentsByPublished !== false) {
      items = items.reduce(orderByPublished, []);
    }

    // Define the model
    var model = {
      published: utils.dateTimePublished(cont, cont.language || 'no'),
      from: cont.publish.from,
      heading: cont.data.heading || cont.displayName,
      ingress: cont.data.ingress,
      items: items,
      hideDate: cont.data.hide_date === true,
      hideSectionContentsDate: cont.data.hideSectionContentsDate === true
    };

    // Render a thymeleaf template
    var body = thymeleaf.render(view, model);

    // Return the result
    return {
      body: body
    };
  });
};

function orderByPublished(list, element) {
  for (var i = 0; i < list.length; i += 1) {
    if (new Date(list[i].published) < new Date(element.published)) {
      list.splice(i, 0, element);
      return list;
    }
  }
  list.push(element);
  return list;
}
