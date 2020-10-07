// {...panda, mood: sad}
// spread operator does not work in exported functions (?!)
// Object.assign is not defined :(
const objectAssign = require('/lib/object-assign');

const deepSearchParseJsonAndAppend = (obj, searchFor, appendTo) => {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.map((item) => deepSearchParseJsonAndAppend(item, searchFor, appendTo));
        }

        const newObj = {};
        Object.keys(obj).forEach((key) => {
            if (key === searchFor) {
                newObj[appendTo] = objectAssign(JSON.parse(obj[searchFor]) || {}, newObj[appendTo]);
            } else if (key === appendTo) {
                newObj[appendTo] = objectAssign(
                    newObj[appendTo] || {},
                    deepSearchParseJsonAndAppend(obj[appendTo], searchFor, appendTo)
                );
            } else {
                newObj[key] = deepSearchParseJsonAndAppend(obj[key], searchFor, appendTo);
            }
        });
        return newObj;
    }
    return obj;
};

module.exports = deepSearchParseJsonAndAppend;
