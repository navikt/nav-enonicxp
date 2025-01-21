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
import { getArchivedContent } from '../../../lib/external-archive/get-archived-content';

type Response = {
    contentRaw: Content;
    contentRenderProps?: Record<string, unknown> | null;
    versions: VersionReferenceEnriched[];
};

const resolveCurrentContent = (content: Content, locale: string) => {
    return runInLocaleContext({ locale, branch: 'draft', asAdmin: true }, () =>
        runSitecontentGuillotineQuery(content, 'draft')
    );
};

// Ensures all referenced contents are resolved to versions matching the timestamp of the specified content
const resolveToContentTimestamp = (content: Content, locale: string) => {
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

const getContentRenderProps = (
    content: Content,
    locale: string,
    resolveToTs: boolean,
    isArchived: boolean
) => {
    if (isArchived) {
        return getArchivedContent(
            content._id,
            getLayersData().localeToRepoIdMap[locale],
            content.archivedTime || content.modifiedTime || content.createdTime
        );
    }

    return resolveToTs
        ? resolveToContentTimestamp(content, locale)
        : resolveCurrentContent(content, locale);
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

    const { content, isArchived } = getContentForExternalArchive({
        contentId: id,
        versionId,
        locale,
    });
    if (!content) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                msg: `Content not found for ${id}/${locale}/${versionId}`,
            },
        };
    }

    const contentRenderProps = getContentRenderProps(content, locale, !!versionId, isArchived);

    const versions = getPublishedAndModifiedVersions(content._id, locale).filter(
        (v) => !v.isPreviewOrForward
    );

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            contentRaw: content,
            contentRenderProps,
            versions,
        } satisfies Response,
    };
};
