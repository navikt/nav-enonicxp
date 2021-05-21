const { getGlobalValue } = require('/lib/global-values/global-values');

exports.macro = function (context) {
    const { key } = context.params;
    log.info(JSON.stringify(context));

    const value = getGlobalValue(key, 'textValue');

    if (!value) {
        return {
            body: '[teknisk feil: verdi ikke tilgjengelig]',
        };
    }

    return {
        body: value,
    };
};
