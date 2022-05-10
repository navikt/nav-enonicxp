import contentLib from '/lib/xp/content';
import httpClient from '/lib/http-client';
import { forceArray } from '../../lib/utils/nav-utils';
import { getContentFromCustomPath, isValidCustomPath } from '../../lib/custom-paths/custom-paths';
import { frontendAppName, navnoRootPath, redirectsRootPath, urls } from '../../lib/constants';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { logger } from '../../lib/utils/logging';

const errorIcon = {
    data: `<svg width='32' height='32'>\
<circle r='16' cx='16' cy='16' fill='#ba3a26'/>\
</svg>`,
    type: 'image/svg+xml',
};

const warningIcon = {
    data: `<svg width='32' height='32'>\
<circle r='16' cx='16' cy='16' fill='#ffaa33'/>\
</svg>`,
    type: 'image/svg+xml',
};

// Returns an error message to the editor with an intentionally invalid id (customPath id must start with '/')
const generateErrorHit = (displayName: string, description: string) => ({
    id: `error-${Date.now()}`,
    displayName,
    description,
    icon: errorIcon,
});

const verifyIngressOwner = (path: string) => {
    try {
        const response = httpClient.request({
            method: 'HEAD',
            url: `${urls.frontendOrigin}${path}`,
            connectionTimeout: 5000,
            followRedirects: false,
        });

        return response.headers['app-name'] === frontendAppName;
    } catch (e) {
        logger.error(`Error determining ingress owner for ${path} - ${e}`);
        return false;
    }
};

const getResult = ({
    query,
    ids,
}: {
    query?: string;
    ids?: string | string[];
}): XP.CustomSelectorServiceResponseHit[] => {
    const currentSelection = forceArray(ids)[0];
    const suggestedPath = query || currentSelection;

    if (!isValidCustomPath(suggestedPath)) {
        return [
            generateErrorHit(
                `Feil: "${suggestedPath}" er ikke en gyldig kort-url`,
                'Kort-url må starte med "/" og kan inneholde tall, bokstaver (a-z) og bindestrek'
            ),
        ];
    }

    if (suggestedPath !== currentSelection) {
        const contentWithCustomPath = getContentFromCustomPath(suggestedPath);
        if (contentWithCustomPath.length > 0) {
            return [
                generateErrorHit(
                    `Feil: "${suggestedPath}" er allerede i bruk som kort-url`,
                    `"${contentWithCustomPath[0]._path}" bruker allerede denne kort-url'en`
                ),
            ];
        }
    }

    const contentWithInternalPath = runInBranchContext(
        () => contentLib.get({ key: `${navnoRootPath}${suggestedPath}` }),
        'master'
    );
    if (contentWithInternalPath) {
        return [
            generateErrorHit(
                `Feil: "${suggestedPath}" er allerede i bruk som vanlig url`,
                `"${contentWithInternalPath.displayName}" har denne url'en`
            ),
        ];
    }

    const ingressIsOurs = verifyIngressOwner(suggestedPath);
    if (!ingressIsOurs) {
        return [
            generateErrorHit(
                `Feil: "${suggestedPath}" kan tilhøre en annen app på nav.no`,
                "Det krever en teknisk endring for å bruke denne url'en, kontakt Team personbruker"
            ),
        ];
    }

    const redirectContent = runInBranchContext(
        () => contentLib.get({ key: `${redirectsRootPath}${suggestedPath}` }),
        'master'
    );
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

export const get = (req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse => {
    const { query, ids } = req.params;
    const result = getResult({ query, ids });

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
