const httpClient = require('/lib/http-client');
const contentLib = require('/lib/xp/content');
const { frontendOrigin } = require('/lib/headless/url-origin');
const { getRedirectContent } = require('/lib/headless/guillotine/queries/sitecontent');
const { getContentWithCustomPath } = require('/lib/custom-paths/custom-paths');
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

const getResult = (suggestedPath) => {
    if (!suggestedPath) {
        return [];
    }

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

    const contentWithCustomPath = getContentWithCustomPath(suggestedPath);
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

    const responseFromPath = httpClient.request({
        url: `${frontendOrigin}${suggestedPath}`,
        method: 'HEAD',
    });
    if (responseFromPath.status !== 404) {
        return [
            {
                id: `error-${Date.now()}`,
                displayName: `Feil: "${suggestedPath}" brukes av en annen app på nav.no`,
                description: '',
                icon: errorIcon,
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
