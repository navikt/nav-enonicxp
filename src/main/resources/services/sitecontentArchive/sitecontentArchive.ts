import { Content } from '/lib/xp/content';
import * as contentLib from '/lib/xp/content';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { SITECONTENT_404_MSG_PREFIX } from '../../lib/constants';
import { forceArray } from '../../lib/utils/array-utils';
import { CustomContentDescriptor } from '../../types/content-types/content-config';
import { getRepoConnection } from '../../lib/utils/repo-utils';
import { getNodeVersions, getPublishedVersionTimestamps } from '../../lib/utils/version-utils';
import { runInTimeTravelContext } from '../../lib/time-travel/run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { isUUID } from '../../lib/utils/uuid';
import { stripPathPrefix } from '../../lib/paths/path-utils';

const getPageTemplate = (content: Content) => {
    const templates = contentLib.getChildren({ key: '/www.nav.no/_templates', count: 1000 }).hits;

    return templates.find((template) => {
        if (template.type !== 'portal:page-template') {
            return false;
        }

        return forceArray(template.data.supports).includes(content.type as CustomContentDescriptor);
    });
};

const getArchivedContentRef = (idOrArchivedPath: string) => {
    if (isUUID(idOrArchivedPath)) {
        return idOrArchivedPath;
    }

    return `/archive${stripPathPrefix(idOrArchivedPath)}`;
};

export const getMostRecentLiveContent = (idOrArchivedPath: string, repoId: string) => {
    const contentRef = getArchivedContentRef(idOrArchivedPath);

    const repoConnection = getRepoConnection({ branch: 'draft', repoId });

    const contentNode = repoConnection.get(contentRef);

    if (!contentNode) {
        logger.info(`Content not found - ${contentRef} in repo ${repoId}`);
        return null;
    }

    const mostRecentLiveVersion = getNodeVersions({
        nodeKey: contentNode._id,
        branch: 'draft',
        repoId,
    }).find((version) => version.nodePath.startsWith('/content'));

    if (!mostRecentLiveVersion) {
        logger.info(`No live version found for content - ${contentRef} in repo ${repoId}`);
        return null;
    }

    logger.info(`Content props: ${JSON.stringify(mostRecentLiveVersion)}`);

    const mostRecentLiveContent = contentLib.get({
        key: mostRecentLiveVersion.nodeId,
        versionId: mostRecentLiveVersion.versionId,
    });

    if (!mostRecentLiveContent) {
        logger.info(
            `Could not retrieve last known live content - ${JSON.stringify(
                mostRecentLiveVersion
            )} in repo ${repoId}`
        );
        return null;
    }

    return runInTimeTravelContext(
        {
            dateTime: mostRecentLiveContent.modifiedTime,
            branch: 'draft',
            baseContentKey: mostRecentLiveVersion.nodeId,
        },
        () => {
            const content = runSitecontentGuillotineQuery(mostRecentLiveContent, 'draft');
            if (!content) {
                logger.info(`No result from guillotine query - ${contentRef} in repo ${repoId}`);
                return null;
            }

            const page =
                content.page && Object.keys(content.page).length > 0
                    ? content.page
                    : getPageTemplate(content)?.page || {};

            return {
                ...content,
                page,
                versionTimestamps: getPublishedVersionTimestamps(content._id),
                livePath: mostRecentLiveContent._path,
            };
        }
    );
};

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { id: isOrArchivedPath, locale } = req.params;
    if (!isOrArchivedPath) {
        return {
            status: 400,
            body: {
                message: 'No valid id parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    const { localeToRepoIdMap, defaultLocale } = getLayersData();
    const repoId = localeToRepoIdMap[locale || defaultLocale];

    try {
        const content = getMostRecentLiveContent(isOrArchivedPath, repoId);

        if (!content) {
            const msg = `${SITECONTENT_404_MSG_PREFIX} in archive: ${isOrArchivedPath}`;
            logger.info(msg);

            return {
                status: 404,
                body: {
                    message: msg,
                },
                contentType: 'application/json',
            };
        }

        return {
            status: 200,
            body: content,
            contentType: 'application/json',
        };
    } catch (e) {
        const msg = `Error fetching content version for ${isOrArchivedPath} - ${e}`;

        logger.error(msg);

        return {
            status: 500,
            body: {
                message: `Server error - ${msg}`,
            },
            contentType: 'application/json',
        };
    }
};
