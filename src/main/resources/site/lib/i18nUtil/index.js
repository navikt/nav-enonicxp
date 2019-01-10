var i = require('/lib/xp/i18n');

module.exports = {
    parseBundle: parseBundle
};

function parseBundle(locale) {
    locale = locale || 'no';
    var bundle = i.getPhrases(locale, ['/site/i18n/phrases_' + locale, '/site/i18n/phrases']);
    var ret = {};
    for (var k in bundle) {
        if (bundle.hasOwnProperty(k)) ret = chain(ret, i.localize({
            key: k,
            locale: [locale, 'no']
        }), k.split('.'))
    }
    return ret;
}

function chain(object, value, array) {
    var el = array.shift();
    if (!el) {
        return value
    }
    if (!object[el]) object[el] =chain({}, value, array);
    else object[el] = chain(object[el], value, array);
    return object
}