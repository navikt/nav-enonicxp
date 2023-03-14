import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import { isMedia } from '../utils/content-utils';
import { ContentTypeWithProductDetails, OverviewPageIllustrationIcon } from './types';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';

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

    return icons.reduce<OverviewPageIllustrationIcon[]>((acc, icon) => {
        if (!icon.icon) {
            return acc;
        }

        const resource = contentLib.get({ key: icon.icon });
        if (!resource) {
            return acc;
        }

        if (!isMedia(resource)) {
            logger.error(
                `Overview page icon reference ${icon.icon} is an invalid type ${resource.type}`
            );
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
                    type: resource.type,
                    mediaUrl,
                },
            },
        ];
    }, []);
};
