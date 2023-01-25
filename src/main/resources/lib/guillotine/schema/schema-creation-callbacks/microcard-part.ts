import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';

// Resolve targetPage content to a localized version matching the product details
// language if such a version exists
const getLocalizedTargetPageFromProductDetailsLink = (
    baseContentId: string,
    targetBaseContent: Content<any>
) => {
    const baseContent = contentLib.get({ key: baseContentId });
    if (baseContent?.type !== 'no.nav.navno:product-details') {
        return null;
    }

    const targetLocalizedContentId = forceArray(targetBaseContent.data?.languages).find(
        (localizedContentId: string) => {
            const localizedContent = contentLib.get({ key: localizedContentId });
            return localizedContent?.language === baseContent.language;
        }
    );
    if (!targetLocalizedContentId) {
        return null;
    }

    return contentLib.get({ key: targetLocalizedContentId });
};

export const microCardTargetPageCallback: CreationCallback = (context, params) => {
    params.fields.targetPage.args = { baseContentId: graphQlLib.GraphQLID };
    params.fields.targetPage.resolve = (env) => {
        const { targetPage } = env.source;
        if (!targetPage) {
            return null;
        }

        const targetBaseContent = contentLib.get<any>({ key: targetPage });
        if (!targetBaseContent) {
            return null;
        }

        const targetLocalizedContent = getLocalizedTargetPageFromProductDetailsLink(
            env.args.baseContentId,
            targetBaseContent
        );

        return targetLocalizedContent || targetBaseContent;
    };
};
