import contentLib from '/lib/xp/content';
import httpClient from '/lib/http-client';
import portalLib from '/lib/xp/portal';
import { forceArray } from '../../lib/utils/nav-utils';
import { getContentFromCustomPath, isValidCustomPath } from '../../lib/custom-paths/custom-paths';
import {
    frontendAppName,
    navnoRootPath,
    redirectsRootPath,
    redirectsRootPathLegacy,
    urls,
} from '../../lib/constants';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { logger } from '../../lib/utils/logging';
import { customSelectorErrorIcon, customSelectorWarningIcon } from '../custom-selector-icons';

// Returns an error message to the editor with an intentionally invalid id (customPath id must start with '/')
const generateErrorHit = (displayName: string, description: string) => ({
    id: `error-${Date.now()}`,
    displayName,
    description,
    icon: customSelectorErrorIcon,
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
        const contentWithCustomPath = getContentFromCustomPath(suggestedPath)[0];
        if (contentWithCustomPath) {
            const currentContent = portalLib.getContent();
            if (currentContent._id !== contentWithCustomPath._id) {
                return [
                    generateErrorHit(
                        `Feil: "${suggestedPath}" er allerede i bruk som kort-url`,
                        `"${contentWithCustomPath._path}" bruker allerede denne kort-url'en`
                    ),
                ];
            }
        }
    }

    const contentWithInternalPath = runInBranchContext(
        () => contentLib.get({ key: `${navnoRootPath}${suggestedPath}` }),
        'master'
    );
    if (contentWithInternalPath && contentWithInternalPath.type !== 'portal:site') {
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
        () =>
            contentLib.get({ key: `${redirectsRootPath}${suggestedPath}` }) ||
            contentLib.get({ key: `${redirectsRootPathLegacy}${suggestedPath}` }),
        'master'
    );
    if (redirectContent && redirectContent.type !== 'base:folder') {
        return [
            {
                id: suggestedPath,
                displayName: suggestedPath,
                description: `Advarsel: ${suggestedPath} er i bruk som redirect url - redirect vil overstyres av kort-url`,
                icon: customSelectorWarningIcon,
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
