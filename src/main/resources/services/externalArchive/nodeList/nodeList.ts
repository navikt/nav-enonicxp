import { Request } from '@enonic-types/core';
import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { isValidLocale } from '../../../lib/localization/layers-data';
import { buildExternalArchiveNodeList } from '../../../lib/external-archive/node-list';

type Params = Partial<{
    locale: string;
    after: string;
    count: string;
}>;

const DEFAULT_COUNT = 1000;
const MAX_COUNT = 2000;

export const externalArchiveNodeListService = (req: Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { locale, after, count } = req.params as Params;

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                message: 'Locale not specified or invalid',
            },
            contentType: 'application/json',
        };
    }

    const parsedCount = Math.floor(Number(count));
    const countNum =
        Number.isFinite(parsedCount) && parsedCount > 0
            ? Math.min(parsedCount, MAX_COUNT)
            : DEFAULT_COUNT;

    const result = buildExternalArchiveNodeList(locale, after ?? '', countNum);

    return {
        status: 200,
        body: result,
        contentType: 'application/json',
    };
};
