import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { SITECONTENT_404_MSG_PREFIX } from '../../lib/constants';
import { forceArray } from '../../lib/utils/array-utils';
import { getRepoConnection } from '../../lib/utils/repo-utils';
import { getNodeVersions, getContentVersionFromTime } from '../../lib/utils/version-utils';
import { runInTimeTravelContext } from '../../lib/time-travel/run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { isUUID } from '../../lib/utils/uuid';
import { stripPathPrefix } from '../../lib/paths/path-utils';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/datetime-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { SitecontentResponse } from '../sitecontent/common/content-response';

// We need to find page templates ourselves, as the version history hack we use for resolving content
// from the archive does not work with the Java method Guillotine uses for resolving page templates
const getPageTemplate = (content: NonNullable<SitecontentResponse>) => {
    // If the content has its own customized page component, it should not need a page template
    if (content.page?.customized) {
        return null;
    }

    const pageTemplates = contentLib.getChildren({
        key: '/www.nav.no/_templates',
        count: 1000,
    }).hits;

    const supportedTemplate = pageTemplates.find(
        (template): template is Content<'portal:page-template'> => {
            if (template.type !== 'portal:page-template') {
                return false;
            }

            return forceArray(template.data.supports).includes(content.type);
        }
    );
    if (!supportedTemplate) {
        logger.info(`No supported template found for ${content.type}`);
        return null;
    }

    const guillotineTemplate = runSitecontentGuillotineQuery(supportedTemplate, 'master');
    if (!guillotineTemplate) {
        logger.info(`Could not resolve template: ${supportedTemplate._id}`);
        return supportedTemplate.page;
    }

    return guillotineTemplate.page;
};

const getArchivedContentRef = (idOrArchivedPath: string) => {
    if (isUUID(idOrArchivedPath)) {
        return idOrArchivedPath;
    }

    return `/archive${stripPathPrefix(idOrArchivedPath)}`;
};

const getPreArchivedVersions = (contentId: string, repoId: string) => {
    return getNodeVersions({
        nodeKey: contentId,
        branch: 'draft',
        repoId,
    }).filter((version) => version.nodePath.startsWith('/content'));
};

const getPreArchiveContent = (idOrArchivedPath: string, repoId: string, time?: string) => {
    const contentRef = getArchivedContentRef(idOrArchivedPath);

    const repoConnection = getRepoConnection({ branch: 'draft', repoId });

    const archivedNode = repoConnection.get(contentRef);
    if (!archivedNode) {
        logger.info(`Archived node not found - ${contentRef} in repo ${repoId}`);
        return null;
    }

    const preArchivedVersions = getPreArchivedVersions(archivedNode._id, repoId);

    const requestedVersion = time
        ? getContentVersionFromTime({
              nodeKey: contentRef,
              unixTime: getUnixTimeFromDateTimeString(time),
              repoId,
              branch: 'draft',
              getOldestIfNotFound: false,
          })
        : preArchivedVersions[0];
    if (!requestedVersion) {
        logger.info(
            `No live version found for content - ${contentRef} in repo ${repoId} (time: ${time})`
        );
        return null;
    }

    const requestedContent = contentLib.get({
        key: requestedVersion.nodeId,
        versionId: requestedVersion.versionId,
    });
    if (!requestedContent) {
        logger.info(
            `Could not retrieve version content - ${requestedVersion.nodeId} / ${requestedVersion.versionId} in repo ${repoId}`
        );
        return null;
    }

    const content = runInTimeTravelContext(
        {
            baseContentKey: requestedVersion.nodeId,
            dateTime: requestedContent.modifiedTime || requestedContent.createdTime,
            branch: 'draft',
            repoId,
        },
        () => {
            return runSitecontentGuillotineQuery(requestedContent, 'draft');
        }
    );

    if (!content) {
        logger.info(`No result from guillotine query - ${contentRef} in repo ${repoId}`);
        return null;
    }

    return {
        ...content,
        page: getPageTemplate(content) || content.page,
    };
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

    const { id: idOrArchivedPath, locale, time } = req.params;
    if (!idOrArchivedPath) {
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
        const content = runInContext({ asAdmin: true, branch: 'draft', repository: repoId }, () =>
            getPreArchiveContent(idOrArchivedPath, repoId, time)
        );

        if (!content) {
            const msg = `${SITECONTENT_404_MSG_PREFIX} in archive: ${idOrArchivedPath}`;
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
        const msg = `Error fetching content version for ${idOrArchivedPath} - ${e}`;

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
