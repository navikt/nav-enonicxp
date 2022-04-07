const contentLib = require('/lib/xp/content');
const { forceArray } = require('/lib/utils/nav-utils');
const { getRedirectContent } = require('/lib/guillotine/queries/sitecontent');
const { getContentFromCustomPath } = require('/lib/custom-paths/custom-paths');
const { isValidCustomPath } = require('/lib/custom-paths/custom-paths');

const errorIcon = {
    data: `<svg width="32" height="32">\
<circle r="16" cx="16" cy="16" fill="#ba3a26"/>\
</svg>`,
    type: 'image/svg+xml',
};

const warningIcon = {
    data: `<svg width="32" height="32">\
<circle r="16" cx="16" cy="16" fill="#ffaa33"/>\
</svg>`,
    type: 'image/svg+xml',
};

const getResult = ({ query, ids }) => {
    const currentSelection = forceArray(ids)[0];
    const suggestedPath = query || currentSelection;

    if (!isValidCustomPath(suggestedPath)) {
        return [
            {
                id: `error-${Date.now()}`,
                displayName: `Feil: "${suggestedPath}" er ikke en gyldig kort-url`,
                description:
                    'Kort-url må starte med "/" og kan inneholde tall, bokstaver (a-z) og bindestrek',
                icon: errorIcon,
            },
        ];
    }

    if (suggestedPath !== currentSelection) {
        const contentWithCustomPath = getContentFromCustomPath(suggestedPath);
        if (contentWithCustomPath.length > 0) {
            return [
                {
                    id: `error-${Date.now()}`,
                    displayName: `Feil: "${suggestedPath}" er allerede i bruk som kort-url`,
                    description: `"${contentWithCustomPath[0]._path}" bruker allerede denne kort-url'en`,
                    icon: errorIcon,
                },
            ];
        }
    }

    const contentWithInternalPath = contentLib.get({ key: `/www.nav.no${suggestedPath}` });
    if (contentWithInternalPath) {
        return [
            {
                id: `error-${Date.now()}`,
                displayName: `Feil: "${suggestedPath}" er allerede i bruk som vanlig url`,
                description: `"${contentWithInternalPath.displayName}" har denne url'en`,
                icon: errorIcon,
            },
        ];
    }

    const redirectContent = getRedirectContent(`/www.nav.no${suggestedPath}`);
    if (redirectContent) {
        return [
            {
                id: suggestedPath,
                displayName: suggestedPath,
                description: `Advarsel: ${suggestedPath} er i bruk som redirect url - redirect vil overstyres av kort-url`,
                icon: warningIcon,
            },
        ];
    }

    return [
        {
            id: suggestedPath,
            displayName: suggestedPath,
            description: `Denne siden vil kunne nåes på nav.no${suggestedPath}`,
        },
    ];
};

const handleGet = (req) => {
    const result = getResult(req.params);

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
