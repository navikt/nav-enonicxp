var trans = require('../contentTranslator');


// Takes the raw Ekstra_Stor_tabell content and parses it to correct JSON format
function parseToJSON(html) {
    var trimm = trimmed(html);  // Cuts all the whitespace characters

    var current = trimm.match(/<([\/0-9a-zA-Z\s\\"=]*)>/g); // Maps the tags into groups

    current = unmap(current, trimm); // Unmaps and parses into raw Ekstra_stor_tabell JSON

    current = reParse(current.o); // Alters the raw JSON into correct JSON properties
    return current;
}


function reParse(e) {
        e = insertDivAfterTable(e);
        e = changeTableClass(e);
      //  e = checkIfStatGroupHeadOrStatGroupRestAndChange(e),
        e = changeTh(e);
        e = changeH1Tag(e);
        e = alterElementsIfTbody(e);
        e = filterAttributes(e);
        e.children = recurse(reParse, 'children', e);
        return e;
}

///// Adapted functions ///////



function filterAttributes(element) {
    delete element.attribute.cellpadding;
    delete element.attribute.cellspacing;
    if (element.attribute && element.attribute.class) element.attribute.class = element.attribute.class.reduce(function (p,e) {
      if (p.indexOf(e) && !e.startsWith('stat')) p.push(e);
      return p;
    },[]);
    return element;
}


function checkIfStatGroupHeadOrStatGroupRestAndChange(element) {
    var isStatGroup = function (e) {
        return e.tag === 'td' && e.attribute.class && e.attribute.class.reduce(function (p, e) { return p || e.indexOf('statGroup') > -1 },false);
    };


    return doIf(isStatGroup(element), setStrongOnElement, returnElement, element);


}
var setStrongOnElement = function (e) {
    e = setAttribute('class', 'NAVsemiHead', e);
    e.content = '<strong>' + e.content + '</strong>';
    return e;
};

function insertDivAfterTable(element) {
    element.children = element.children.reduce(function (t, e) {
        t.push(e);
        if (e.tag === 'table') t.push(insertSpacer());
        return t;
    },[]);
    return element
}


function insertSpacer() {
    return {
        tag: 'div',
        attribute: {'class': ['NAVportletSpacer']},
        content: '&nbsp;',
        children: []
    }
}


function setAttribute(name, value, element) {
    if (!element) {
        return function(el) {
            if (!el.attribute[name]) el.attribute[name] = [];
            el.attribute[name].push(value);
            return el;
        }
    }
    else {
        if (!element.attribute[name]) element.attribute[name] = [];
        element.attribute[name].push(value);
        return element;
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
    return doIf(isTh(e), mix(setAttribute('scope', 'col'), function (e) {
        e.content = '<div>'+e.content+'</div>';
        return e
    }), returnElement, e);
}

function alterTrElement(element) {
    return changeClass('NAValternateRow', element);
}


function isTbody(element) {
    return element.tag === 'tbody';
}

function changeFirstTd(element) {
    var isFirstChild = setParentOfFirstChild(element.children);
    var setNavTextClass = changeClass('NAVtextColumn');
    var doIfFirstChild = doIf(isFirstChild, mix(setNavTextClass,setScopeRow), returnElement);
    element.children = recurse(mix(doIfFirstChild,checkIfStatGroupHeadOrStatGroupRestAndChange), 'children', element);
    return element;
}

function changeFirstFirstTd(element) {
    var isFirstChild = setParentOfFirstChild(element.children);
    var setExtendedNavTextClass = mix(setStrongOnElement, changeClass('NAVtextColumn'));
    var doIfFirstChild = doIf(isFirstChild, mix(setExtendedNavTextClass,setScopeRow), setStrongOnElement);
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
    return doIf(element.tag === 'h1', changeTagValue('tag', 'h4'), returnElement, element);
}

// General functions
// Most of the general functions takes the most important parameter last
// If the last parameter is not provided it returns a function that is primed with the other parameters and expects
// the most important parameter. Also they return the modified last parameter

// Change an objects field value to something else
function changeTagValue(field, to, element) {
    if (!element) return function (e) {
        return changeTagValue(field, to, e);
    };
    else {
        element[field] = to;
        return element;
    }
}
// Checks if element is first element
function isFirstChild(array, element) {
    if (!element) {
        return function (e) {
            return array.indexOf(e) === 0;
        }
    }
    return array.indexOf(element) === 0;
}

// Insert a class attribute
function changeClass(className, element) {
    if (!element) return function (element) {
        return setAttribute('class', className, element);
    }
    return setAttribute('class', className, element);
}

// Helper
function setParentOfFirstChild(array) {
    return isFirstChild(array);
}
// Set the parent array to check for child even index number
function setEvenChildParent(array) {
    return function (el) {
        return array.indexOf(el) % 2 === 0;
    }
}

// For each loop for given fields. Return array that have been processed with given function f

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
// Function does f on element e if eva is evaluated to true, else it does nf on element e.
// if evaluator eva is function it evaluates eva with e
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
        if (typeof eva === 'function') {
            return doIf(eva(e), f, nf, e)

        }
        else if (eva) return f(e);
        else return nf(e);
    }
}


// Mix takes function a and calls it with b that calls it with c
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

// Passes element
function returnElement(element) {
    return element;
}



function unmap(array, string) {
    var el = array.shift();                                     // Pick out the next tag to parse
    var rtag = el.replace(/[<>]/g, '');                         // Get the tag name and attributes, without ><
    var split = rtag.split(" ");                                // Split the tag name and attributes into groups
    var tag = split.shift();                                    // Get the tag name
    var rattributes = split.reduce(function (t, el) {           // Reduce the rest of attributes to an object with
        var name = el.split("=")[0];                            //  key=attribute name and an array of attribute
        var value = el.split("=")[1].replace(/"/g, '');         //  properties
        if (!t.hasOwnProperty(name)) t[name] = [];
        t[name].push(value);
        return t;
    },{});
    var o = {                                                   // Create the element object
        tag: tag,
        attribute: rattributes,
        content: '',
        children: []
    };
    var next = array.shift();                                   // Get the next tag
    while (next && !next.startsWith('</' + tag +'>')) {         // If it is not the closing tag, then it is an element
        array.unshift(next);                                    //  child. Then put it back to the array and start again
        var i = unmap(array, string);                           //
        array = i.array;
        string = i.string;
        o.children.push(i.o);
        next = array.shift();
    }
                                                                // Now get the content text for our element node
    var start = string.indexOf(el) + el.length;                 // This removes the child elements from the trimmed string
    var end = string.indexOf('</' + tag + '>');                 // So as the three grows, the trimmed string shrinks
    var c = string.substr(start, end - start);                  // Leaving just the content text between the start and
                                                                // closing tags

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

function m(o, skipFirst) {                                     // Builds the JSON to html again
    var s = '';
    if (!skipFirst) {
        s = '<' + o.tag;
        for (var k in o.attribute) {
           if (o.attribute.hasOwnProperty(k)) s += ' '+ k + '="' + o.attribute[k].join(" ") + '"'
        }
        s += '>' + o.content;
    }

    o.children.forEach(function (v) {
        s += m(v, false);
    });
    if (!skipFirst) s+= '</' + o.tag + '>';
    return s;
}