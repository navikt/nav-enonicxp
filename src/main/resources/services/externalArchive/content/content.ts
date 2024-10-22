import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getPublishedVersionRefs, VersionHistoryReference } from '../../../lib/utils/version-utils';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { runSitecontentGuillotineQuery } from '../../../lib/guillotine/queries/run-sitecontent-query';

type Response = {
    contentRaw: Content;
    versions: VersionHistoryReference[];
    contentForRender?: Record<string, unknown>;
};

export const externalArchiveContentGet = (req: XP.Request) => {
    const { id, locale } = req.params;

    if (!id || !locale) {
        return {
            status: 400,
            body: {
                msg: 'Parameters id and locale are required',
            },
        };
    }

    const contentRaw = runInLocaleContext({ locale }, () => contentLib.get({ key: id }));
    if (!contentRaw) {
        return {
            status: 404,
        };
    }

    const contentForRender = runSitecontentGuillotineQuery(contentRaw, 'draft') ?? undefined;

    const versions = getPublishedVersionRefs(contentRaw._id, locale);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            contentRaw,
            contentForRender,
            versions,
        } satisfies Response,
    };
};
