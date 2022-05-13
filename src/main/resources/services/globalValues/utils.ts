import {
    insufficientPermissionResponse,
    validateCurrentUserPermissionForContent,
} from '../../lib/utils/auth-utils';
import { GlobalValueContentDescriptor, validCaseTimeUnits } from '../../lib/global-values/types';
import { CaseProcessingTimeUnit } from '../../types/content-types/case-processing-time-set';

export type GlobalNumberValueInputParams = {
    numberValue: number;
    contentType: 'no.nav.navno:global-value-set';
};

export type GlobalCaseTimesInputParams = {
    unit: CaseProcessingTimeUnit;
    value: number;
    contentType: 'no.nav.navno:case-processing-time-set';
};

export type GlobalValueInputParams = {
    contentId: string;
    itemName: string;
    contentType: GlobalValueContentDescriptor;
} & (GlobalNumberValueInputParams | GlobalCaseTimesInputParams);

const validateNumberValueParams = ({ numberValue }: Partial<GlobalNumberValueInputParams>) => {
    if (numberValue !== undefined && isNaN(numberValue)) {
        return gvServiceInvalidRequestResponse(`numberValue ${numberValue} must be a number`);
    }

    return null;
};

const validateCaseTimeParams = ({ value, unit }: Partial<GlobalCaseTimesInputParams>) => {
    if (value !== undefined && isNaN(value)) {
        return gvServiceInvalidRequestResponse(`value ${value} must be a number`);
    }

    if (!validCaseTimeUnits[unit as CaseProcessingTimeUnit]) {
        return gvServiceInvalidRequestResponse(
            `unit ${unit} must be one of ${Object.keys(validCaseTimeUnits).join(', ')}`
        );
    }

    return null;
};

export const validateGlobalValueInputAndGetErrorResponse = (
    params: Partial<GlobalValueInputParams>
) => {
    const { contentId, itemName, contentType } = params;

    if (!contentId || !itemName || !contentType) {
        return gvServiceInvalidRequestResponse(
            'Missing parameters:' +
                `${!contentId && ' contentId'}` +
                `${!itemName && ' itemName'}` +
                `${!contentType && ' contentType'}`
        );
    }

    if (!validateCurrentUserPermissionForContent(contentId, 'MODIFY')) {
        return insufficientPermissionResponse('MODIFY');
    }

    if (contentType === 'no.nav.navno:global-value-set') {
        return validateNumberValueParams(params);
    } else if (contentType === 'no.nav.navno:case-processing-time-set') {
        return validateCaseTimeParams(params);
    }

    return gvServiceInvalidRequestResponse(`Invalid content type ${contentType}`);
};

export const gvServiceInvalidRequestResponse = (msg: string) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid request: ${msg}`,
        level: 'error',
    },
});
