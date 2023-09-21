import { Content } from '/lib/xp/content';
import { getContentFromCustomPath, isValidCustomPath } from './custom-path-utils';
import { logger } from '../../utils/logging';
import { sanitize } from '/lib/xp/common';

export const FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX = '/start';

const audienceSegmentMap: Record<string, string> = {
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
} as const;

const getAudienceSegmentWithSlash = (content: Content<'no.nav.navno:form-intermediate-step'>) => {
    const audienceSelected = content.data.audience?._selected;

    const audienceSegment = audienceSelected && audienceSegmentMap[audienceSelected];
    return audienceSegment ? `/${audienceSegment}` : '';
};

export const formIntermediateStepValidateCustomPath = (
    customPath: string,
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    if (!isValidCustomPath(customPath)) {
        return false;
    }

    const audienceSegment = getAudienceSegmentWithSlash(content);

    const isValid = new RegExp(
        `${FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX}${audienceSegment}/.+`
    ).test(customPath);

    return isValid;
};

export const formIntermediateStepGenerateCustomPath = (
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    const audienceSegment = getAudienceSegmentWithSlash(content);

    const suggestedPath = `${FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX}${audienceSegment}/${sanitize(
        content._name
    )}`;

    const contentWithCustomPath = getContentFromCustomPath(suggestedPath);
    if (
        contentWithCustomPath.length > 1 ||
        (contentWithCustomPath.length === 1 && contentWithCustomPath[0]._id !== content._id)
    ) {
        logger.error(
            `Content with customPath ${suggestedPath} already exists: ${contentWithCustomPath
                .map((content) => content._path)
                .join(', ')}`
        );
        return `${suggestedPath}-${content._id}`;
    }

    return suggestedPath;
};
