import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { isValidLocale } from '../../../lib/localization/layers-data';
import { getContentTreeData } from '../../../lib/external-archive/content-tree';

type Params = Partial<{
    path: string;
    locale: string;
}>;

export const externalArchiveContentTreeGet = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { path, locale } = req.params as Params;

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
                message: `Locale ${locale} is not valid`,
            },
            contentType: 'application/json',
        };
    }

    const contentTreeData = getContentTreeData(path, locale);

    if (!contentTreeData) {
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
        body: contentTreeData,
        contentType: 'application/json',
    };
};
