import { Content } from '/lib/xp/content';
import { getContentFromCustomPath, isValidCustomPath } from './custom-path-utils';
import { logger } from '../../utils/logging';
import { Audience } from '../../../site/mixins/audience/audience';

export const FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX = '/start';

const audienceSegmentMap: Record<string, string> = {
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
};

const getAudienceSegmentWithSlash = (audience: Audience['audience']['_selected']) => {
    const audienceSegment = audienceSegmentMap[audience];
    return audienceSegment ? `/${audienceSegment}` : '';
};

export const formIntermediateStepValidateCustomPath = (
    customPath: string,
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    if (!isValidCustomPath(customPath)) {
        return false;
    }

    const { audience } = content.data;

    const audienceSegment = getAudienceSegmentWithSlash(audience._selected);

    const isValid = new RegExp(
        `${FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX}${audienceSegment}/.+`
    ).test(customPath);

    return isValid;
};

export const formIntermediateStepGenerateCustomPath = (
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    const suggestedPath = `${FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX}${getAudienceSegmentWithSlash(
        content.data.audience._selected
    )}/${content._name}`;

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
