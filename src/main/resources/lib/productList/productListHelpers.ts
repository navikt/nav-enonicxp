import contentLib from '/lib/xp/content';
import { AnimatedIcons } from 'site/content-types/animated-icons/animated-icons';

export const getProductIllustrationIcons = (product: any) => {
    const illustrationId = product?.data?.illustration;

    if (!illustrationId) {
        return null;
    }

    const illustrationDocument = contentLib.get({ key: illustrationId });

    if (!illustrationDocument) {
        return null;
    }

    const { icons = [] } = illustrationDocument.data as AnimatedIcons;

    return icons
        .filter(({ icon }: any) => !!icon)
        .map(({ icon }: any) => {
            const resource = contentLib.get({ key: icon });

            if (!resource) {
                return null;
            }

            return {
                icon: {
                    _type: 'media_Vector',
                    mediaUrl: resource._path.toString(),
                },
            };
        });
};
