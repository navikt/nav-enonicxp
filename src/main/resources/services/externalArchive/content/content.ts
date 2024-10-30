import { Content } from '/lib/xp/content';
import { runSitecontentGuillotineQuery } from '../../../lib/guillotine/queries/run-sitecontent-query';
import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { runInTimeTravelContext } from '../../../lib/time-travel/run-with-time-travel';
import {
    getPublishedAndModifiedVersions,
    VersionReferenceEnriched,
} from '../../../lib/time-travel/get-published-versions';
import { getLastPublishedContentVersion } from '../../../lib/external-archive/last-published-content';
import { getRepoConnection } from '../../../lib/repos/repo-utils';
import { RepoConnection } from '/lib/xp/node';
import { transformRepoContentNode } from '../../../lib/utils/content-utils';

type Response = {
    contentRaw: Content;
    contentRenderProps?: Record<string, unknown>;
    versions: VersionReferenceEnriched[];
};

const resolveCurrentContent = (content: Content) => {
    return runSitecontentGuillotineQuery(content, 'draft');
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

const getRequestedContentVersion = (contentId: string, versionId: string, repo: RepoConnection) => {
    const contentNode = repo.get<Content>({ key: contentId, versionId });
    return contentNode ? transformRepoContentNode(contentNode) : null;
};

export const externalArchiveContentGet = (req: XP.Request) => {
    const { id, locale, versionId } = req.params;

    if (!id || !locale) {
        return {
            status: 400,
            body: {
                msg: 'Parameters id and locale are required',
            },
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                msg: `Invalid locale specified: ${locale}`,
            },
        };
    }

    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    const contentRaw = versionId
        ? getRequestedContentVersion(id, versionId, repo)
        : getLastPublishedContentVersion(id, repo);

    if (!contentRaw) {
        return {
            status: 404,
        };
    }

    const resolvedContent = versionId
        ? resolveVersionContent(contentRaw, locale)
        : resolveCurrentContent(contentRaw);

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
