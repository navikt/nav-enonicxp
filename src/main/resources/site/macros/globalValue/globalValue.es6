const { getGlobalValue } = require('/lib/global-values/global-values');

exports.macro = function (context) {
    const { globalKey } = context.params;

    const value = getGlobalValue(globalKey, 'text');

    if (!value) {
        return {
            body: '[teknisk feil: verdi ikke tilgjengelig]',
        };
    }

    return {
        body: value,
    };
};
