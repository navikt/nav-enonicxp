var trans = require('../contentTranslator');

function parseToJSON(html) {
    var trimm = trimmed(html);

    var current = trimm.match(/<([\/0-9a-zA-Z\s\\"=]*)>/g);

    current = unmap(current, trimm);

    current = reParse(current.o);
    return current;
}

function reParse(object) {
    var f = function (e) {
        e = insertDivAfterTable(e);
        e = changeTableClass(e);
        e = changeTh(e);
        e = changeH1Tag(e);
        e = alterElementsIfTbody(e);
        e.children = recurse(f, 'children', e);
        return e;
    }
    return f(object);
}

function returnElement(element) {
    return element;
}

function insertDivAfterTable(element) {
    var index = hasTableAsChild(element);
    if (index.length > 0) element.children = element.children.reduce(function (t, e) {
       if (e.tag === 'table') t.push(insertSpacer());
        t.push(e)
        return t;
    },[]);
    return element
}

function hasTableAsChild(e) {
    return findAll(e.children,function (c) {
        return c.tag === 'table'
    })
}

function findAll(array, cb) {
   return array.reduce(function (t,e, ind) {
        if (cb(e)) t.push(ind);
        return t;
    },[]);

}

function insertSpacer() {
    return {
        tag: 'div',
        attribute: [{name: 'class', value: 'NAVportletSpacer'}],
        content: '&nbsp;',
        children: []
    }
}

function changeTableClass(element) {
    return doIf(element.tag === 'table', changeClass('NAVnumTbl'), returnElement, element);
}

function setScopeRow(element) {
    return setAttribute('scope', 'row', element);
}
function isTh(elem) {
    return elem.tag === 'th'
}
function changeTh(e) {
    return doIf(isTh(e), setAttribute('scope', 'col'), returnElement, e);
}

function alterTrElement(element) {
    return changeClass('NAValternateRow', element);
}
function setParentOfFirstChild(array) {
    return isFirstChild(array);
}
function setEvenChildParent(array) {
    return function (el) {
        return array.indexOf(el) % 2 === 0;
    }
}


function isTbody(element) {
    return element.tag === 'tbody';
}

function changeFirstTd(element) {
    var isFirstChild = setParentOfFirstChild(element.children);
    var setNavTextClass = changeClass('NAVtextColumn');
    var doIfFirstChild = doIf(isFirstChild, mix(setNavTextClass,setScopeRow), returnElement);
    element.children = recurse(doIfFirstChild, 'children', element);
    return element;
}

function changeFirstFirstTd(element) {
    var isFirstChild = setParentOfFirstChild(element.children);
    var setExtendedNavTextClass = changeClass('NAVsemiHead NAVtextColumn');
    var setStandard = changeClass('NAVsemiHead');
    var doIfFirstChild = doIf(isFirstChild, mix(setExtendedNavTextClass,setScopeRow), setStandard);
    element.children = recurse(doIfFirstChild, 'children', element);
    return element
}

function changeTbodyChildren(element) {
    var isEvenChild = setEvenChildParent(element.children);
    var isFirstChild = setParentOfFirstChild(element.children);
    var changeTrElement = doIf(isEvenChild, mix(alterTrElement,changeFirstTd), changeFirstTd);
    var changeTrElementAndIsFirstChild = doIf(isFirstChild, mix(alterTrElement, changeFirstFirstTd), changeTrElement);
    element.children = recurse(changeTrElementAndIsFirstChild, 'children', element);
    return element;

}

function alterElementsIfTbody(element) {
    return doIf(isTbody(element), changeTbodyChildren, returnElement, element);
}

var setAlternateClass = function (array, element) {
    if (!element) return function (el) {
        return setAlternateClass(array, el)
    };
    return doIf(array.indexOf(element) % 2 === 0, changeClass('NAValternateRow'), returnElement, element);
};

function changeH1Tag(element) {
    var ctv = changeTagValue('tag', 'h4');
    var dctv = function (element) {
        return element
    };
    return doIf(element.tag === 'h1', ctv, dctv, element);
}

function changeTagValue(field, to, element) {
    if (!element) return function (e) {
        return changeTagValue(field, to, e);
    };
    else {
        element[field] = to;
        return element;
    }
}

function isFirstChild(array, element) {
    if (!element) {
        return function (e) {
            return array.indexOf(e) === 0;
        }
    }
    return array.indexOf(element) === 0;
}
function changeClass(className, element) {
    if (!element) return function (element) {
        return setAttribute('class', className, element);
    }
    return setAttribute('class', className, element);
}

function recurse(f, field, el) {
    var all = field.split('.');
    if (!el) {
        return function (e) {
            return recurse(f, field, e);
        }
    }
    else {
        var res = [];
        var fiel = all.shift();
        var t ;
        while (fiel) {
            if (!t) t = el[fiel];
            else t = t[fiel];
            fiel = all.shift();
        }

        if (t) t.forEach(function (v) {
            res.push(f(v));
        });
        return res;
    }

}

function doIf(eva, f,nf, e) {
    if (!e) {
        if (typeof eva === 'function') {
            return function (el) {
                return doIf(eva(el), f, nf, el)
            }
        }
        else if (eva) return function (el) {
            return f(el)
        };
        else return function (el) {
            return nf(el);
        }
    }
    else {
        if (eva) return f(e);
        else return nf(e);
    }
}

function mix(a, b, c) {
    if (!b) {
        return function (b, c) {
            return a(b(c));
        }
    }
    else if (!c) {
        return function(c) {
            return a(b(c));
        }
    }
    else return a(b(c));
}

function setAttribute(name, value, element) {
    var ob = {name: name, value: value};
    if (!element) {
        return function(element) {
            var index = element.attribute.indexOf(ob);
            if (index === -1) element.attribute.push(ob);
            else element.attribute[index] = ob;
            return element;
        }
    }
    else {
        var index = element.attribute.indexOf(ob);
        if (index === -1) element.attribute.push(ob);
        else element.attribute[index] = ob;
        return element;
    }
}

function unmap(array, string) {

    var el = array.shift();
    var rtag = el.replace(/[<>]/g, '');
    var split = rtag.split(" ");
    var tag = split.shift();
    var rattributes = split.reduce(function (t, el) {
        t.push({name: el.split("=")[0], value: el.split("=")[1].replace(/"/g, '')})
        return t;
    },[]);
    var o = {
        tag: tag,
        attribute: rattributes,
        content: '',
        children: []
    };
    var next = array.shift();
    while (next && !next.startsWith('</' + tag +'>')) {

        array.unshift(next);
        var i = unmap(array, string);
        array = i.array;
        string = i.string;
        o.children.push(i.o);
        next = array.shift();
    }

    var start = string.indexOf(el) + el.length;
    var end = string.indexOf('</' + tag + '>');
    var c = string.substr(start, end - start);


    o.content = c;

    string = string.replace(el + c + '</' + tag + '>', '');

    return {
        o: o,
        array: array,
        string: string
    };
}

function trimmed(string) {
    return string.trim().replace(/\r\n\s+/g, '');
}

exports.parse = parseToJSON;

exports.map = m;

function m(o) {
    var s = '<' + o.tag;
    o.attribute.forEach(function (value) {
        s += ' '+ value.name + '"' + value.value + '"'
    });
    s += '>' + o.content;
    o.children.forEach(function (v) {
        s += m(v);
    });
    s+= '</' + o.tag + '>'
    return s;
}