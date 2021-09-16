Object.defineProperty(Array.prototype, 'find', {
    value: function (predicate) {
        if (!this) {
            return null;
        }
        if (typeof predicate !== 'function') {
            throw new TypeError(`${predicate} is not a function`);
        }

        for (let index = 0; index < this.length; index++) {
            const element = this[index];
            if (predicate(element, index, this)) {
                return element;
            }
        }

        return null;
    },
    configurable: true,
    writable: true,
});

Object.defineProperty(Array.prototype, 'findIndex', {
    value: function (predicate) {
        if (!this) {
            return null;
        }
        if (typeof predicate !== 'function') {
            throw new TypeError(`${predicate} is not a function`);
        }

        for (let index = 0; index < this.length; index++) {
            const element = this[index];
            if (predicate(element, index, this)) {
                return index;
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

        const flattenArray = (arr) => {
            for (let i = 0; i < arr.length; i++) {
                const element = arr[i];
                if (Array.isArray(element)) {
                    flattenArray(element);
                } else {
                    newArray.push(element);
                }
            }
        };

        flattenArray(this);

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

Object.defineProperty(String.prototype, 'includes', {
    value: function (searchString, position = 0) {
        if (!this) {
            return null;
        }
        if (typeof searchString !== 'string') {
            throw new TypeError(`${searchString} is not a string`);
        }
        if (typeof position !== 'number') {
            throw new TypeError(`${position} is not a number`);
        }

        return this.indexOf(searchString, position) !== -1;
    },
    configurable: true,
    writable: true,
});

Object.defineProperty(Array.prototype, 'includes', {
    value: function (searchValue, fromIndex = 0) {
        if (!this) {
            return null;
        }
        if (typeof fromIndex !== 'number') {
            throw new TypeError(`${fromIndex} is not a number`);
        }

        return this.indexOf(searchValue, fromIndex) !== -1;
    },
    configurable: true,
    writable: true,
});
