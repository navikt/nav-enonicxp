import contentLib from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import { sanitizeText } from '/lib/guillotine/util/naming';
import { forceArray } from '../utils/nav-utils';
import { OverviewPageIllustrationIcon } from './productList';

export const getProductIllustrationIcons = (product: any) => {
    const illustrationId = product?.data?.illustration;
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
