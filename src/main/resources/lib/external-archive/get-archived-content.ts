import { getRepoConnection } from '../repos/repo-utils';
import { logger } from '../utils/logging';
import { getContentVersionFromTime, getNodeVersions } from '../utils/version-utils';
import { getUnixTimeFromDateTimeString } from '../utils/datetime-utils';
import * as contentLib from '/lib/xp/content';
import { runInTimeTravelContext } from '../time-travel/run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { isUUID } from '../utils/uuid';
import { stripPathPrefix } from '../paths/path-utils';
import { SitecontentResponse } from '../../services/sitecontent/common/content-response';
import { Content } from '/lib/xp/content';
import { forceArray } from '../utils/array-utils';

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

export const getArchivedContent = (idOrArchivedPath: string, repoId: string, time?: string) => {
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
