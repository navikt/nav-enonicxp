import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { forceArray } from '../../../utils/array-utils';
import { URLS } from '../../../constants';
import { getPublicPath } from '../../../paths/public-path';
import { hasExternalProductUrl } from '../../../paths/path-utils';

export const getSearchNodeHref = (content: Content, locale: string) => {
    switch (content.type) {
        case 'no.nav.navno:external-search-content':
        case 'no.nav.navno:external-link': {
            return content.data.url;
        }
        case 'no.nav.navno:form-details': {
            const application = forceArray(content.data?.formType).find(
                (formType) => formType._selected === 'application'
            );
            if (!application || application._selected !== 'application') {
                return null;
            }

            const variation = forceArray(application.application?.variations)[0];
            if (!variation) {
                return null;
            }

            const selectedLink = variation.link?._selected;
            if (!selectedLink) {
                return null;
            }

            if (selectedLink === 'external') {
                return variation.link.external?.url;
            }

            const targetContentId = variation.link.internal?.target;
            if (!targetContentId) {
                return null;
            }

            const targetContent = contentLib.get({ key: targetContentId });
            if (!targetContent) {
                return null;
            }

            return `${URLS.FRONTEND_ORIGIN}${getPublicPath(targetContent, locale)}`;
        }
        default: {
            return hasExternalProductUrl(content)
                ? content.data.externalProductUrl
                : `${URLS.FRONTEND_ORIGIN}${getPublicPath(content, locale)}`;
        }
    }
};
