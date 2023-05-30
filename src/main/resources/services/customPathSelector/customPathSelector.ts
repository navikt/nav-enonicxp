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
import { forceArray } from '../../lib/utils/array-utils';
import {
    formIntermediateStepGenerateCustomPath,
    formIntermediateStepValidateCustomPath,
} from '../../lib/paths/custom-paths/custom-path-special-types';

type SpecialUrlType = 'formIntermediateStep';

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
            connectionTimeout: 5000,
            followRedirects: false,
        });

        return response.headers['app-name'] === FRONTEND_APP_NAME;
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
}): XP.CustomSelectorServiceResponseHit => {
    const currentSelection = forceArray(ids)[0];
    const suggestedPath = query || currentSelection;

    if (!isValidCustomPath(suggestedPath)) {
        return generateErrorHit(
            `Feil: "${suggestedPath}" er ikke en gyldig kort-url`,
            'Kort-url må starte med "/" og kan inneholde tall, bokstaver (a-z) og bindestrek'
        );
    }

    if (suggestedPath !== currentSelection) {
        const contentWithCustomPath = getContentFromCustomPath(suggestedPath)[0];
        if (contentWithCustomPath) {
            const currentContent = portalLib.getContent();
            if (currentContent._id !== contentWithCustomPath._id) {
                return generateErrorHit(
                    `Feil: "${suggestedPath}" er allerede i bruk som kort-url`,
                    `"${contentWithCustomPath._path}" bruker allerede denne kort-url'en`
                );
            }
        }
    }

    const contentWithInternalPath = runInContext({ branch: 'master' }, () =>
        contentLib.get({ key: `${NAVNO_ROOT_PATH}${suggestedPath}` })
    );
    if (contentWithInternalPath && contentWithInternalPath.type !== 'portal:site') {
        return generateErrorHit(
            `Feil: "${suggestedPath}" er allerede i bruk som vanlig url`,
            `"${contentWithInternalPath.displayName}" har denne url'en`
        );
    }

    const ingressIsOurs = verifyIngressOwner(suggestedPath);
    if (!ingressIsOurs) {
        return generateErrorHit(
            `Feil: "${suggestedPath}" kan tilhøre en annen app på nav.no`,
            "Det krever en teknisk endring for å bruke denne url'en, kontakt Team personbruker"
        );
    }

    const redirectMasterContent = runInContext({ branch: 'master' }, () =>
        contentLib.get({ key: `${REDIRECTS_ROOT_PATH}${suggestedPath}` })
    );

    if (redirectMasterContent && redirectMasterContent.type !== 'base:folder') {
        return {
            id: suggestedPath,
            displayName: suggestedPath,
            description: `Advarsel: ${suggestedPath} er i bruk som redirect url - redirect vil overstyres av kort-url`,
            icon: customSelectorWarningIcon,
        };
    }
    // Also check draft content for custom paths to catch any content
    // that hasn't been published yet (ie. not yet in master)
    const redirectDraftContent = runInContext({ branch: 'draft' }, () => {
        const existingContentWithSuggestedPath = contentLib.query({
            start: 0,
            count: 1,
            filters: {
                boolean: {
                    must: { hasValue: { field: 'data.customPath', values: [suggestedPath] } },
                },
            },
        }).hits;
        return existingContentWithSuggestedPath[0];
    });

    if (redirectDraftContent && redirectDraftContent.type !== 'base:folder') {
        return {
            id: suggestedPath,
            displayName: suggestedPath,
            description: `Advarsel: ${suggestedPath} er ibruk i annet innhold som ikke er publisert ennå. Konflikter vil kunne oppstå.`,
            icon: customSelectorWarningIcon,
        };
    }

    return {
        id: suggestedPath,
        displayName: suggestedPath,
        description: `Denne siden vil kunne nåes på nav.no${suggestedPath}`,
    };
};

const validateFormIntermediateStepResult = (result: XP.CustomSelectorServiceResponseHit) => {
    const content = portalLib.getContent();
    if (content.type !== 'no.nav.navno:form-intermediate-step') {
        logger.error(
            `Selector was called with formIntermediateStep-parameter for a different content type ${content._path}`
        );
        return result;
    }

    if (formIntermediateStepValidateCustomPath(result.id, content)) {
        return result;
    }

    const examplePath = formIntermediateStepGenerateCustomPath(content);

    return generateErrorHit(
        `Feil: "${result.id}" er ikke en gyldig url for mellomsteg`,
        `Eksempel på gyldig url: ${examplePath}`
    );
};

const validateResult = (
    result: XP.CustomSelectorServiceResponseHit,
    type?: SpecialUrlType
): XP.CustomSelectorServiceResponseHit => {
    if (type === 'formIntermediateStep') {
        return validateFormIntermediateStepResult(result);
    }

    return result;
};

export const get = (req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse => {
    const { query, ids, type } = req.params;

    const result = getResult({ query, ids });

    const validatedResult = validateResult(result, type as SpecialUrlType);

    return {
        status: 200,
        body: {
            total: 1,
            count: 1,
            hits: [validatedResult],
        },
        contentType: 'application/json',
    };
};
