
var portal = require('/lib/xp/portal');
var trans = require('/lib/contentTranslator');
var contentLib = require('/lib/xp/content');
var thymeleaf = require('/lib/xp/thymeleaf');
exports.responseFilter = function (req, res) {
    var content = portal.getContent();
    log.info("From filter");
   // trans.transSidebeskrivelse('0a397e62-c064-4494-905a-b835991d7811');
    //trans.trans('Kort_om');
    trans.refresh();
    //trans.nodeCheck('76b3fee6-d989-4430-a2ca-4fe2ba94ad94');
    //trans.nodeCheck('5fdf71e7-cf1f-4da6-a782-8285ef8abbe9');
   // trans.logBeautify(trans.testNodeLib());
   // trans.logBeautify(contentLib.get({key: '83b9e5a4-f077-4611-9ca5-450eebbb60fb'}));
   //var r =contentLib.get({
    //    key: '83b9e5a4-f077-4611-9ca5-450eebbb60fb'
  //  });
   //trans.logBeautify(trans.checkTextForRefs(r));
  //  var ra = trans.checkTextForRefs(r);
  // var rn = trans.translate(r);

  // trans.logBeautify(rn);
  //  trans.logBeautify(ra);



    function changePage() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':cms2xp_page']
            });
            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (el.page && el.page.template && el.page.template ==='645296f8-7b57-4e8c-98c3-cf3fae172918') t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.translate(value);
        });
    }

    //changePage();
    function changeKortOm() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':Kort_om']
            });

            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (!el.publish || !el.publish.to) t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.translate(value);
        });
    }

    function changeBigSection2OppslagsTavle() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':cms2xp_section']
            });
            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (el.page && el.page.template && el.page.template ==='93e5b5ba-e593-4d43-b055-3234d164f7db') t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.translateTables(value);
        });
    }

    function changeSection2TavleListe() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':cms2xp_section']
            });
            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (el.page && el.page.template && el.page.template ==='debed1f9-8310-4e79-93f0-c0f64245d4fc') t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.doTableListTranslation(value);
        });
    }
   // changeSection2TavleListe();
//    changeBigSection2OppslagsTavle();

   // changeKortOm();  93e5b5ba-e593-4d43-b055-3234d164f7db debed1f9-8310-4e79-93f0-c0f64245d4fc

    function changeSection2OppslagsTavle() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':cms2xp_section']
            });
            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (el.page && el.page.template && el.page.template ==='a5316223-aeaf-4f70-9b78-126dba2a0aab') t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.translateTables(value);
        });
    }

   // changeSection2OppslagsTavle();

    function changeNavNyhet() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':main-article']
            });

            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (!el.publish || !el.publish.to) t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.translate(value);
        });
    }
   // changeNavNyhet();

    function changeArtikkelBrukerPortal() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':Artikkel_Brukerportal']
            });

            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                if (!el.publish || !el.publish.to) t.push(el);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.translate(value);
        });
    }

    function changeSidebeskrivelse() {
        var pagesWithChildren = [];
        var length = 100;
        var start = 0;
        while (length === 100) {
            var q = contentLib.query({
                start: start,
                count: length,
                contentTypes: [app.name + ':nav.sidebeskrivelse']
            });

            length = q.hits.length;
            start += length;
            pagesWithChildren = q.hits.reduce(function (t, el) {
                t.push(el._id);
                return t;
            }, pagesWithChildren)
        }

        pagesWithChildren.forEach(function (value) {
            trans.transSidebeskrivelse(value);
        });
    }

   // changeArtikkelBrukerPortal();
   // trans.translate(contentLib.get({
    //    key: '0c4979f8-ed3e-4e2b-9dcc-3d9b1301c66f'
    //}))

   // changeSidebeskrivelse();
    //changeNavNyhet();
    /*pagesWithChildren.forEach(function(page) {
        if (page.type === app.name + ':cms2xp_page') {
            trans.translate(page);
            contentLib.getChildren({
                key: page._path
            }).hits.forEach(function (value) {
                if (value.type === app.name +':cms2xp_page') {
                    trans.translate(value)
                }
            })
        }
    });*/
    /*   var templates = {
           templates: []
       };
       var length = 100;
       var start = 0;
       while (length === 100) {
           var q = contentLib.query({
               start: start,
               count: length,
               contentTypes: [app.name + ':cms2xp_section']
           });
           length = q.hits.length;
           start += length;
           templates = q.hits.reduce(function(t, el) {
               if (el.hasOwnProperty('page') && el.page.hasOwnProperty('template')) {
                   if (!t.hasOwnProperty(el.page.template)) {
                       t[el.page.template] = {
                           count: 0,
                           templateId: el.page.template,
                           items: []
                       };
                       t.templates.push(el.page.template);
                   }
                   t[el.page.template].items.push(el.displayName);
                   t[el.page.template].count++;
               }
               return t;
           },templates)
       }*/
    //trans.logBeautify(templates);
    //trans.logBeautify(content);
    //trans.logBeautify(req);
    // var newContent = trans.translate(content);
    //if (newContent === content) trans.translateTables(content);
    return res;
}