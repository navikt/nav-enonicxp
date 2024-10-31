import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { isValidLocale } from '../../../lib/localization/layers-data';
import { buildExternalArchiveContentTreeLevel } from '../../../lib/external-archive/content-tree';

type Params = Partial<{
    path: string;
    locale: string;
    fromArchive?: 'true';
}>;

export const externalArchiveContentTreeService = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { path, locale, fromArchive } = req.params as Params;

    if (!path) {
        return {
            status: 400,
            body: {
                message: 'Parent path not specified',
            },
            contentType: 'application/json',
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                message: 'Locale not specified or invalid',
            },
            contentType: 'application/json',
        };
    }

    const contentTreeLevelData = buildExternalArchiveContentTreeLevel(
        path,
        locale,
        fromArchive === 'true'
    );

    if (!contentTreeLevelData) {
        return {
            status: 404,
            body: {
                message: `Not found: ${path} in ${locale}`,
            },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: contentTreeLevelData,
        contentType: 'application/json',
    };
};
