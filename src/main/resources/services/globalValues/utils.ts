import {
    insufficientPermissionResponse,
    validateCurrentUserPermissionForContent,
} from '../../lib/utils/auth-utils';
import { validCaseTimeUnits } from '../../lib/global-values/types';
import { CaseProcessingTimeUnit } from '../../types/content-types/case-processing-time-set';

export type GlobalValueCommonInputParams = {
    key: string;
    contentId: string;
    itemName: string;
};

export type GlobalNumberValueInputParams = {
    numberValue: number;
    contentType: 'no.nav.navno:global-value-set';
} & GlobalValueCommonInputParams;

export type GlobalCaseTimesInputParams = {
    unit: CaseProcessingTimeUnit;
    value: number;
    contentType: 'no.nav.navno:case-processing-time-set';
} & GlobalValueCommonInputParams;

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

export const validateGlobalValueInputAndGetErrorResponse = (params: XP.Request['params']) => {
    const { contentId, itemName, type } = params;

    if (!contentId || !itemName || !type) {
        return gvServiceInvalidRequestResponse(
            'Missing parameters:' +
                `${!contentId ? ' contentId' : ''}` +
                `${!itemName ? ' itemName' : ''}` +
                `${!type ? ' type' : ''}`
        );
    }

    if (!validateCurrentUserPermissionForContent(contentId, 'MODIFY')) {
        return insufficientPermissionResponse('MODIFY');
    }

    if (type === 'numberValue') {
        return validateNumberValueParams(params);
    } else if (type === 'caseTime') {
        return validateCaseTimeParams(params);
    }

    return gvServiceInvalidRequestResponse(`Invalid value type ${type}`);
};

export const gvServiceInvalidRequestResponse = (msg: string) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid request: ${msg}`,
        level: 'error',
    },
});
