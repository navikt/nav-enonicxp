import { Content } from '/lib/xp/content';
import { runSitecontentGuillotineQuery } from '../../../lib/guillotine/queries/run-sitecontent-query';
import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { runInTimeTravelContext } from '../../../lib/time-travel/run-with-time-travel';
import {
    getPublishedAndModifiedVersions,
    VersionReferenceEnriched,
} from '../../../lib/time-travel/get-published-versions';
import { getContentForExternalArchive } from '../../../lib/external-archive/get-content';
import { runInLocaleContext } from '../../../lib/localization/locale-context';

type Response = {
    contentRaw: Content;
    contentRenderProps?: Record<string, unknown>;
    versions: VersionReferenceEnriched[];
};

const resolveCurrentContent = (content: Content, locale: string) => {
    return runInLocaleContext({ locale, branch: 'master' }, () =>
        runSitecontentGuillotineQuery(content, 'draft')
    );
};

const resolveVersionContent = (content: Content, locale: string) => {
    return runInTimeTravelContext(
        {
            dateTime: content.modifiedTime || content.createdTime,
            repoId: getLayersData().localeToRepoIdMap[locale],
            branch: 'master',
            baseContentKey: content._id,
        },
        () => runSitecontentGuillotineQuery(content, 'draft')
    );
};

export const externalArchiveContentService = (req: XP.Request) => {
    const { id, locale, versionId } = req.params;

    if (!id || !locale) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: 'Parameters id and locale are required',
            },
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: `Invalid locale specified: ${locale}`,
            },
        };
    }

    const contentRaw = getContentForExternalArchive({ contentId: id, versionId, locale });
    if (!contentRaw) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                msg: `Content not found for ${id}/${locale}/${versionId}`,
            },
        };
    }

    const resolvedContent = versionId
        ? resolveVersionContent(contentRaw, locale)
        : resolveCurrentContent(contentRaw, locale);

    const versions = getPublishedAndModifiedVersions(contentRaw._id, locale);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            contentRaw,
            contentRenderProps: resolvedContent ?? undefined,
            versions,
        } satisfies Response,
    };
};
