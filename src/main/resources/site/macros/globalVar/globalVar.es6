const contentLib = require('/lib/xp/content');

const getValue = (content) => {
    const value = content?.data?.value?.text;

    if (!value) {
        return null;
    }

    return value;
};

exports.macro = function (context) {
    const { target } = context.params;
    const content = contentLib.get({ key: target });

    const value = getValue(content);

    if (!value) {
        if (context.mode === 'edit') {
            return {
                body: 'Gjenbrukbar verdi ikke funnet!',
            };
        }

        return {
            body: '[teknisk feil: verdi ikke tilgjengelig]',
        };
    }

    return {
        body: value,
    };
};
