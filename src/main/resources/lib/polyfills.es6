Object.defineProperty(Array.prototype, 'find', {
    value: function (predicate) {
        if (!this) {
            return null;
        }
        if (typeof predicate !== 'function') {
            throw new TypeError(`${predicate} is not a function`);
        }

        for (let i = 0; i < this.length; i++) {
            const element = this[i];
            if (predicate(element, i, this)) {
                return element;
            }
        }

        return null;
    },
    configurable: true,
    writable: true,
});

Object.defineProperty(Array.prototype, 'flat', {
    value: function () {
        if (!this) {
            return null;
        }

        const newArray = [];

        const recursiveMap = (arr) => {
            for (let i = 0; i < arr.length; i++) {
                const element = arr[i];
                if (Array.isArray(element)) {
                    recursiveMap(element);
                } else {
                    newArray.push(element);
                }
            }
        };

        recursiveMap(this);

        return newArray;
    },
    configurable: true,
    writable: true,
});

Object.entries = function (obj) {
    if (obj === null || obj === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
    }

    const _obj = Object(obj);

    return Object.keys(_obj).map((key) => [key, _obj[key]]);
};

Object.values = function (obj) {
    if (obj === null || obj === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
    }

    const _obj = Object(obj);

    return Object.keys(_obj).map((key) => _obj[key]);
};
