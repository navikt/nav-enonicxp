/*****************************************************************************************
 *                                                                                       *
 * This library ensures that the language versions of a content,                         *
 * is being distributed to all sibling versions                                          *
 *                                                                                       *
 * There are some rules to follow that makes this a little complicated                   *
 *                                                                                       *
 * Short version is as follows                                                           *
 * 1. A content is being created as another language version of some content             *
 *      this implies that it has the data.language field set as non-empty                *
 * 2. The linked version is asserted to have all other language versions                 *
 *      of itself in its own data.language field. We use this as a reference             *
 * 3. The ids missing in the reference data.language field will be                       *
 *      itself and the new language version id. So we add that in the reference          *
 * 4. Adding versions is called a positive reference, removing is a                      *
 *      negative reference                                                               *
 * 5. We will then iterate over the list of references and update each version           *
 *      with the change                                                                  *
 *                                                                                       *
 * Longer version                                                                        *
 *                                                                                       *
 * 6. The creation of a content will call the node.updated listener.                     *
 *      Updating a content will also call the node.updated listener, so we need          *
 *      to have a list of affected content ids in order to not run the methods           *
 *      too many times on the same references creating an eternal loop of DEATH!!        *
 *                                                                                       *
 * 7. Insertion of affected ids must be done as the last thing before altering           *
 *      the content. A content node is deemed not affected when the node.updated         *
 *      listener has been called on the node and found in the list of affected ids.      *
 *                                                                                       *
 * 8. A positive reference is stated by the following rules                              *
 *     i. The content is not found in the master branch but have                         *
 *          non-empty data.languages in draft                                            *
 *     ii. The content is found in the master branch, and the draft data.languages       *
 *           differs from master data.languages with >0                                  *
 *                                                                                       *
 *    A negative reference is stated by the following rule                               *
 *     iii. The content is found in the master branch, and the draft data.languages      *
 *            differs from master data.languages with <0                                 *
 *                                                                                       *
 *                                                                                       *
 *                                                                                       *
 *****************************************************************************************/





var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var event = require('/lib/xp/event');
var affectedIDs = [];

module.exports = {
    handleLanguageVersions: handleLanguageVersions
}

function handleLanguageVersions(trans) {

    function addId(id) {
        affectedIDs.push(id);
    }

    event.listener({
        type: 'node.updated',
        callback: function(event) { // #6

            // #6
            if (affectedIDs.indexOf(event.data.nodes[0].id) !== -1) { // #7
                affectedIDs.splice(affectedIDs.indexOf(event.data.nodes[0].id), 1);
                trans.logBeautify(affectedIDs);
                return;
            }


            var e = content.get({
                key: event.data.nodes[0].id,
                branch: 'draft'
            });
            var m = content.get({
                key: event.data.nodes[0].id,
                branch: 'master'
            });


            var ea = e ? getArray(e.data.languages) : [];
            var ma = m ? getArray(m.data.languages) : [];


            if (ea.join() === ma.join() || ((e && e.type !== app.name + ':main-article') || (m && m.type !== app.name + ':main-article'))) return;


            context.run({
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ["role:system.admin"]
            }, function () {

                if (e.type === app.name + ':main-article') {
                    getElementFromEvent(event)(checkDiff)(getCompleteSetOfReferences)(updateReferences);
                }

            });

            function getElementFromEvent(event) {
                var res = content.get({key: event.data.nodes[0].id});
                function then(cb) {
                    res = cb(res);
                    return then;
                }
                return then;
            }

            function updateReferences(refs) {
                refs.refs.forEach(function (ref) {
                    if (!ref) {
                        log.info('Missing');
                    }
                    else {
                        content.modify({
                            key: ref,
                            editor: function (c) {
                                if (refs.remove === c._id) {
                                    c.data.languages = [];
                                    addId(c._id); // #7
                                    return c;
                                }
                                else{
                                    var change = refs.refs.reduce(function (previousValue, e) {
                                        if (e !== c._id && e !== refs.remove) previousValue.push(e); // Remove references to my self
                                        return previousValue;
                                    }, []);
                                    var check = getArray(c.data.languages);
                                    if (change.sort().join() !== check.sort().join()) { // Check if any differences, if there are, we will change the content #5
                                        addId(c._id); // #7
                                        c.data.languages = change;
                                        return c;
                                    }
                                }
                            }
                        })
                    }
                })
            }
            function getCompleteSetOfReferences(res) {
                if (res.diff === 0) return {remove: false, refs: []};
                else if (res.diff === 1) return getPositiveReferences(res.element);
                return getNegativeReferences(res.element);

                function getPositiveReferences(element) {
                    var ref = getArray(element.data.languages).shift(); // #2
                    if (!ref) {
                        return {
                            remove: false,
                            refs: []
                        }
                    }
                    var refEl = content.get({key: ref});
                    var refElLangList = getArray(refEl.data.languages);
                    return {
                        remove: false,
                        refs: refElLangList.concat([element._id, ref].concat(getArray(element.data.languages))).reduce(function (previousValue,e) { // #3
                            if (previousValue.indexOf(e) === -1) previousValue.push(e); // Get only unique refs
                            return previousValue;
                        },[])};
                }

                function getNegativeReferences(element) {
                    var m = content.get({
                        key: element._id,
                        branch: 'master'
                    });

                    var a = getArray(m.data.languages);
                    var b = getArray(element.data.languages);

                    var remRef = a.find(function(v) {
                        return this.indexOf(v) === -1;
                    }, b);

                    return {remove:remRef, refs: a.concat([m._id])};
                }
            }

            // Will force return an array no mather what the content is

            function getArray(a) {
                if (!a) return [];
                if (!Array.isArray(a)) return [a];
                return a;
            }

            function checkDiff(element) {
                // Lets assume a positive reference #4
                var diff = 1;
                var master = content.get({
                    key: element._id,
                    branch: 'master'
                });
                // Return if there is no difference in references
                if (master && getArray(master.data.languages).sort().join() === getArray(element.data.languages).sort().join()) return {
                    diff: 0,
                    element: element
                };

                var m = getArray(master ? master.data.languages : undefined);
                var e = getArray(element.data.languages);

                // Since there is only one rule for negative references (#8iii), lets check that one
                if (m.length > e.length) diff = -1;

                return {
                    diff: diff,
                    element: element
                }
            }
        }
    });
};

/// Polyfill for MDN Array.fill method

Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var thisArg = arguments[1];
        var k = 0;
        while (k < len) {

            var kValue = o[k];
            if (predicate.call(thisArg, kValue, k, o)) {
                return kValue;
            }
            k++;
        }
        return undefined;
    },
    configurable: true,
    writable: true
});
