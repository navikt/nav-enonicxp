import { Content } from '/lib/xp/content';
import { getContentFromCustomPath, isValidCustomPath } from './custom-path-utils';
import { logger } from '../../utils/logging';
import { sanitize } from '/lib/xp/common';
import { Audience as AudienceMixin } from '@xp-types/site/mixins/audience';
import { ArrayOrSingle } from '../../../types/util-types';

export const FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX = '/start';

const audienceSegmentMap: Record<string, string> = {
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
} as const;

type Audience = AudienceMixin['audience']['_selected'];

const getSingleAudienceFromContent = (content: Content<any>): Audience | null => {
    const audience = content.data?.audience as
        | ArrayOrSingle<Audience>
        | AudienceMixin['audience']
        | undefined;
    if (!audience) {
        return null;
    }

    if (typeof audience === 'string') {
        return audience;
    }

    if (Array.isArray(audience)) {
        return audience.length === 1 ? audience[0] : null;
    }

    return typeof audience._selected === 'string' ? audience._selected : null;
};

export const getExpectedCustomPathAudiencePrefix = (content: Content) => {
    const audience = getSingleAudienceFromContent(content);
    const audienceSegment = audience && audienceSegmentMap[audience];

    return audienceSegment ? `/${audienceSegment}` : '';
};

export const validateCustomPathForContentAudience = (content: Content, customPath: string) => {
    return (
        isValidCustomPath(customPath) &&
        customPath.startsWith(getExpectedCustomPathAudiencePrefix(content))
    );
};

// The form-intermediate-step content type is a special case wherw we want the customPath to begin with "/start"
export const formIntermediateStepValidateCustomPath = (
    customPath: string,
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    if (!isValidCustomPath(customPath)) {
        return false;
    }

    const audienceSegment = getExpectedCustomPathAudiencePrefix(content);

    const isValid = new RegExp(
        `${FORM_INTERMEDIATE_STEP_CUSTOM_PATH_PREFIX}${audienceSegment}/(?!unnamed).+`
    ).test(customPath);

    return isValid;
};

export const formIntermediateStepGenerateCustomPath = (
    content: Content<'no.nav.navno:form-intermediate-step'>
) => {
    const audienceSegment = getExpectedCustomPathAudiencePrefix(content);

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
