const { getGlobalValueSetService } = require('./getSet/getSet');
const { removeGlobalValueItem } = require('./remove/remove');
const { modifyGlobalValueItem } = require('./modify/modify');
const { addGlobalValueItem } = require('./add/add');
const { getGlobalValueUsageService } = require('./usage/usage');
const { getAllGlobalValues } = require('/lib/global-values/global-values');

const serviceName = __DIR__
    .split('/')
    .filter((str) => !!str)
    .slice(-1)[0];

const getSubPath = (req) =>
    req.path
        .split(serviceName)
        .slice(-1)[0]
        .replace(/(^\/)|(\/$)/, ''); // Trim leading/trailing slash

const selectorHandler = () => {
    const values = getAllGlobalValues();

    const hits = values
        .map((value) => ({
            id: value.key,
            displayName: `${value.itemName} - ${value.setName}`,
            description: ' ',
        }))
        .flat();

    log.info(`Hits: ${JSON.stringify(hits)}`);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};

const globalValues = (req) => {
    log.info(JSON.stringify(req));
    const subPath = getSubPath(req);

    if (!subPath) {
        return selectorHandler();
    }

    if (subPath === 'getSet') {
        return getGlobalValueSetService(req);
    }

    if (subPath === 'usage') {
        return getGlobalValueUsageService(req);
    }

    if (subPath === 'add') {
        return addGlobalValueItem(req);
    }

    if (subPath === 'modify') {
        return modifyGlobalValueItem(req);
    }

    if (subPath === 'remove') {
        return removeGlobalValueItem(req);
    }

    return {
        status: 404,
        contentType: 'application/json',
    };
};

exports.get = globalValues;
