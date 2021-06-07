const contentLib = require('/lib/xp/content');
const { getContentWithCustomPath } = require('/lib/custom-paths/custom-paths');
const { isValidCustomPath } = require('/lib/custom-paths/custom-paths');

const errorIcon = {
    data: `<svg width="32" height="32">\
<circle r="16" cx="16" cy="16" fill="#BA3A26"/>\
</svg>`,
    type: 'image/svg+xml',
};

const getResult = (query) => {
    if (!query) {
        return [];
    }

    if (!isValidCustomPath(query)) {
        return [
            {
                id: `error-${Date.now()}`,
                displayName: `Feil: "${query}" er ikke en gyldig kort-url`,
                description:
                    'Kort-url må starte med / og kan inneholde tall, bokstaver (a-z) og bindestrek',
                icon: errorIcon,
            },
        ];
    }

    const contentWithCustomPath = getContentWithCustomPath(query);
    if (contentWithCustomPath.length > 0) {
        return [
            {
                id: `error-${Date.now()}`,
                displayName: `Feil: "${query}" er allerede i bruk som kort-url`,
                description: `"${contentWithCustomPath[0]._path}" bruker allerede denne kort-url'en`,
                icon: errorIcon,
            },
        ];
    }

    const contentWithInternalPath = contentLib.get({ key: `/www.nav.no${query}` });
    if (contentWithInternalPath) {
        return [
            {
                id: `error-${Date.now()}`,
                displayName: `Feil: "${query}" er allerede i bruk som vanlig url`,
                description: `"${contentWithInternalPath.displayName}" har denne url'en`,
                icon: errorIcon,
            },
        ];
    }

    return [
        {
            id: query,
            displayName: query,
            description: `Denne siden vil kunne nåes på nav.no${query}`,
        },
    ];
};

const handleGet = (req) => {
    const result = getResult(req.params.query);

    return {
        status: 200,
        body: {
            total: result.length,
            count: result.length,
            hits: result,
        },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
