const contentLib = require('/lib/xp/content');

export const getProductIllustrationIcons = (product: any) => {
    const illustrationId = product?.data?.illustration;

    if (!illustrationId) {
        return null;
    }

    const illustrationDocument = contentLib.get({ key: illustrationId });

    if (!illustrationDocument) {
        return null;
    }

    const { icons = [] } = illustrationDocument.data;
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

export const getProductSituationPages = (product: any) => {
    const { situationPages = [] } = product?.data || {};

    const documents = situationPages.map((pageId: string) => {
        const resource = contentLib.get({ key: pageId });

        if (!resource) {
            return null;
        }

        return {
            path: resource._path,
            title: resource.data.title || resource.displayName,
        };
    });

    return documents;
};
