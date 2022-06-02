import contentLib, { Content } from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import { sanitizeText } from '/lib/guillotine/util/naming';
import { forceArray } from '../utils/nav-utils';
import { ContentTypeWithProductDetails, OverviewPageIllustrationIcon } from './types';

export const getProductIllustrationIcons = (product: Content<ContentTypeWithProductDetails>) => {
    // Generated type definitions are incorrect due to nested mixins
    const illustrationId = (product?.data as any)?.illustration;
    if (!illustrationId) {
        return [];
    }

    const illustrationDocument = contentLib.get({ key: illustrationId });
    if (!illustrationDocument || illustrationDocument.type !== 'no.nav.navno:animated-icons') {
        return [];
    }

    const icons = forceArray(illustrationDocument.data.icons);

    return icons.reduce((acc, icon) => {
        if (!icon.icon) {
            return acc;
        }

        const resource = contentLib.get({ key: icon.icon });
        if (!resource) {
            return acc;
        }

        const mediaUrl = portalLib.attachmentUrl({
            id: resource._id,
            download: false,
        });

        return [
            ...acc,
            {
                icon: {
                    __typename: sanitizeText(resource.type),
                    mediaUrl,
                },
            },
        ];
    }, [] as OverviewPageIllustrationIcon[]);
};
