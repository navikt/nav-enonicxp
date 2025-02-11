import * as contentLib from '/lib/xp/content';
import httpClient from '/lib/http-client';
import * as portalLib from '/lib/xp/portal';
import {
    getContentFromCustomPath,
    isValidCustomPath,
} from '../../lib/paths/custom-paths/custom-path-utils';
import { FRONTEND_APP_NAME, NAVNO_ROOT_PATH, REDIRECTS_ROOT_PATH, URLS } from '../../lib/constants';
import { logger } from '../../lib/utils/logging';
import { customSelectorErrorIcon, customSelectorWarningIcon } from '../custom-selector-icons';
import { runInContext } from '../../lib/context/run-in-context';
import {
    formIntermediateStepGenerateCustomPath,
    formIntermediateStepValidateCustomPath,
    getExpectedCustomPathAudiencePrefix,
    validateCustomPathForContentAudience,
} from '../../lib/paths/custom-paths/custom-path-content-validators';
import { RepoBranch } from '../../types/common';
import { customSelectorParseSelectedIdsFromReq } from '../service-utils';
import { Content } from '/lib/xp/content';

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
            url: `${URLS.FRONTEND_ORIGIN}${path}`,
            connectionTimeout: 10000,
            followRedirects: false,
        });

        return response.headers['app-name'] === FRONTEND_APP_NAME;
    } catch (e) {
        logger.error(`Error determining ingress owner for ${path} - ${e}`);
        return false;
    }
};

const findExistingContentsWithCustomPath = (suggestedCustomPath: string, branch: RepoBranch) => {
    const currentId = portalLib.getContent()?._id;
    if (!currentId) {
        return null;
    }

    const otherContentsWithCustomPath = getContentFromCustomPath(
        suggestedCustomPath,
        branch
    ).filter((content) => content._id !== currentId);

    if (otherContentsWithCustomPath.length === 0) {
        return null;
    }

    return otherContentsWithCustomPath.map((content) => content._path).join(', ');
};

const getResult = ({
    query,
    currentSelection,
    content,
}: {
    query?: string;
    currentSelection?: string;
    content: Content;
}): XP.CustomSelectorServiceResponseHit => {
    const suggestedPath = query || currentSelection;

    if (!isValidCustomPath(suggestedPath)) {
        return generateErrorHit(
            `Feil: "${suggestedPath}" er ikke en gyldig kort-url`,
            'Må starte med "/" og kan inneholde tall, bokstaver (a-z) og bindestrek. Kan ikke slutte med "/"'
        );
    }

    const masterContentPaths = findExistingContentsWithCustomPath(suggestedPath, 'master');
    if (masterContentPaths) {
        return generateErrorHit(
            `Feil: "${suggestedPath}" er allerede i bruk som kort-url på publisert innhold`,
            `"${masterContentPaths}" bruker denne kort-url'en`
        );
    }

    const draftContentPaths = findExistingContentsWithCustomPath(suggestedPath, 'draft');
    if (draftContentPaths) {
        return generateErrorHit(
            `Feil: "${suggestedPath}" er allerede i bruk som kort-url på upublisert innhold`,
            `"${draftContentPaths}" bruker denne kort-url'en`
        );
    }

    if (content.type === 'no.nav.navno:form-intermediate-step') {
        if (!formIntermediateStepValidateCustomPath(suggestedPath, content)) {
            const examplePath = formIntermediateStepGenerateCustomPath(content);
            return generateErrorHit(
                `Feil: "${suggestedPath}" er ikke en gyldig url for mellomsteg`,
                `Eksempel på gyldig url: ${examplePath}`
            );
        }
    } else if (!validateCustomPathForContentAudience(content, suggestedPath)) {
        return generateErrorHit(
            `Feil: "${suggestedPath}" er ikke en gyldig url for denne målgruppen`,
            `Url må starte med "${getExpectedCustomPathAudiencePrefix(content)}"`
        );
    }

    const contentWithInternalPath = runInContext({ branch: 'main' }, () =>
        contentLib.get({ key: `${NAVNO_ROOT_PATH}${suggestedPath}` })
    );
    if (contentWithInternalPath) {
        return {
            id: suggestedPath,
            displayName: suggestedPath,
            description: `Advarsel: ${suggestedPath} er allerede i bruk som vanlig url for "${contentWithInternalPath.displayName}" - denne vil overstyres av kort-url`,
            icon: customSelectorWarningIcon,
        };
    }

    const ingressIsOurs = verifyIngressOwner(suggestedPath);
    if (!ingressIsOurs) {
        return {
            id: suggestedPath,
            displayName: suggestedPath,
            description: `"${suggestedPath}" tilhører en annen app på nav.no - Det krever en teknisk endring for å bruke denne url'en`,
            icon: customSelectorWarningIcon,
        };
    }

    const redirectContent = runInContext({ branch: 'main' }, () =>
        contentLib.get({ key: `${REDIRECTS_ROOT_PATH}${suggestedPath}` })
    );
    if (redirectContent && redirectContent.type !== 'base:folder') {
        return {
            id: suggestedPath,
            displayName: suggestedPath,
            description: `Advarsel: ${suggestedPath} er i bruk som redirect url - redirect vil overstyres av kort-url`,
            icon: customSelectorWarningIcon,
        };
    }

    return {
        id: suggestedPath,
        displayName: suggestedPath,
        description: `Denne siden vil kunne nåes på nav.no${suggestedPath}`,
    };
};

export const get = (
    req: XP.Request<XP.CustomSelectorServiceParams>
): XP.CustomSelectorServiceResponse => {
    const content = portalLib.getContent();

    if (!content) {
        return {
            status: 200,
            body: {
                total: 1,
                count: 1,
                hits: [
                    generateErrorHit(
                        'Feil: Kunne ikke hente innhold fra context',
                        'Du kan forsøke å laste editoren på nytt (F5)'
                    ),
                ],
            },
            contentType: 'application/json',
        };
    }

    const { query } = req.params;

    const currentSelection = customSelectorParseSelectedIdsFromReq(req)[0];

    const result = getResult({ query, currentSelection, content });

    return {
        status: 200,
        body: {
            total: 1,
            count: 1,
            hits: [result],
        },
        contentType: 'application/json',
    };
};
