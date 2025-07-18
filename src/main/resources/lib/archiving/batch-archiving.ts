import { QueryDsl } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import * as schedulerLib from '/lib/xp/scheduler';
import { Content } from '/lib/xp/content';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getUnpublishJobName } from '../scheduling/scheduled-publish';
import { getRepoConnection } from '../repos/repo-utils';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { MISC_REPO_ID, URLS } from '../constants';
import { buildEditorPath } from '../paths/editor-path';
import { getMiscRepoConnection } from '../repos/misc-repo';
import { MainArticle } from '@xp-types/site/content-types';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { CONTENT_TYPES_WITH_CONTENT_LISTS } from '../contentlists/remove-unpublished';

type ContentDataSimple = Pick<
    Content,
    '_id' | '_path' | 'createdTime' | 'modifiedTime' | 'type' | 'displayName' | 'publish'
> & {
    subType?: MainArticle['contentType'];
    repoId: string;
    editorUrl: string;
    errors: string[];
    archivedChildren: string[];
    references: ContentDataSimple[];
};

type ArchiveResult = {
    totalFound: number;
    failed: ContentDataSimple[];
    skipped: ContentDataSimple[];
    archived: ContentDataSimple[];
};

const LOG_DIR = 'batch-archiving-logs';
const LOG_DIR_PATH = `/${LOG_DIR}`;

const contentTypeReferencesToIgnore: ReadonlySet<ContentDescriptor> = new Set(
    CONTENT_TYPES_WITH_CONTENT_LISTS
);

const simplifyContent = (content: Content, repoId: string): ContentDataSimple => {
    const { _id, _path, createdTime, modifiedTime, type, data, displayName, publish } = content;

    return {
        _id,
        _path,
        displayName,
        editorUrl: `${URLS.PORTAL_ADMIN_ORIGIN}${buildEditorPath(_id, repoId)}`,
        createdTime,
        modifiedTime,
        publish,
        type,
        subType: data.contentType,
        repoId,
        errors: [],
        references: [],
        archivedChildren: [],
    };
};

const persistResultLogs = (result: ArchiveResult, jobName: string, query: QueryDsl) => {
    const repoConnection = getMiscRepoConnection();

    if (!repoConnection.exists(LOG_DIR_PATH)) {
        repoConnection.create({ _parentPath: '/', _name: LOG_DIR });
    }

    const now = new Date().toISOString();

    const logEntryName = `archived-${jobName}-${now}`;
    const logEntryDataToolboxUrl = [
        URLS.PORTAL_ADMIN_ORIGIN,
        '/admin/tool/systems.rcd.enonic.datatoolbox/data-toolbox#node?repo=',
        MISC_REPO_ID,
        '&branch=master&path=',
        encodeURIComponent(`${LOG_DIR_PATH}/${logEntryName}`),
    ].join('');

    repoConnection.create({
        _parentPath: LOG_DIR_PATH,
        _name: logEntryName,
        summary: {
            finished: now,
            jobName,
            query: JSON.stringify(query),
            totalFound: result.totalFound,
            totalFailed: result.failed.length,
            totalArchived: result.archived.length,
            totalSkipped: result.skipped.length,
        },
        failed: result.failed,
        archived: result.archived,
        skipped: result.skipped,
    });

    logger.info(
        `Batch archiving result for ${logEntryName}: Total contents found ${result.totalFound} | Success count ${result.archived.length} | Failed count ${result.failed.length} | Protected count ${result.skipped.length} - Full results: ${logEntryDataToolboxUrl}`
    );
};

const hasNewerDescendants = (content: ContentDataSimple | Content, timestamp: string): boolean => {
    const children = contentLib.getChildren({ key: content._id, count: 1000 });

    return children.hits.some(
        (child) =>
            (child.publish?.from || child.createdTime) > timestamp ||
            hasNewerDescendants(child, timestamp)
    );
};

const removeScheduledJobsForArchivedContent = (contentIds: string[], repoId: string) => {
    contentIds.forEach((contentId) => {
        // A job won't always exist, so just try our best to delete it
        // and extra handling if there's no job to delete.
        const jobName = getUnpublishJobName(contentId, repoId);
        const result = schedulerLib.delete({ name: jobName });
        logger.info(
            `Remove scheduled unpublish job for archived content ${contentId} - ${jobName}: ${result ? 'Success' : 'No job found'}`
        );
    });
};

const unpublishAndArchiveContents = (
    contents: ContentDataSimple[],
    repoId: string,
    cutoffTs: string
): ArchiveResult => {
    const contentToArchive: ContentDataSimple[] = [];
    const archivedContent: ContentDataSimple[] = [];
    const failedContent: ContentDataSimple[] = [];
    const skippedContent: ContentDataSimple[] = [];

    contents.forEach((content) => {
        const references: ContentDataSimple[] = [];

        const contentFinal: ContentDataSimple = {
            ...content,
            references,
        };

        // Content of type 'no.nav.navno:current-topic-page' should not be archived
        // if it has a publish?.to date set.
        if (contentFinal.type === 'no.nav.navno:current-topic-page' && contentFinal.publish?.to) {
            skippedContent.push(contentFinal);
            return;
        }

        // Content is published and has a publish date that is newer than the cutoff date,
        // so it should not be unpublished. This is not an error, so don't push to the errors array.
        if (contentFinal.publish?.from && contentFinal.publish.from > cutoffTs) {
            skippedContent.push(contentFinal);
            return;
        }

        // If the content has inbound references, don't unpublish as it may lead to broken links etc
        if (contentFinal.references.length > 0) {
            contentFinal.errors.push('Innholdet har innkommende avhengigheter');
        }

        if (contentFinal.errors.length > 0) {
            failedContent.push(contentFinal);
        } else {
            contentToArchive.push(contentFinal);
        }
    });

    runInContext({ branch: 'draft', asAdmin: true }, () =>
        contentToArchive.forEach((content) => {
            try {
                contentLib.unpublish({
                    keys: [content._id],
                });

                const archiveResult = contentLib.archive({ content: content._id });

                archivedContent.push({
                    ...content,
                    archivedChildren: archiveResult.filter((id) => id !== content._id),
                });

                removeScheduledJobsForArchivedContent(
                    [content._id, ...content.archivedChildren],
                    repoId
                );
            } catch (e: any) {
                logger.error(
                    `Failed to unpublish/archive ${content._id} / ${content._path} - ${e}`
                );
                failedContent.push({ ...content, errors: [e.toString()] });
            }
        })
    );

    return {
        totalFound: contents.length,
        failed: failedContent,
        archived: archivedContent,
        skipped: skippedContent,
    };
};

export const findAndArchiveOldContent = ({
    query,
    maxAgeMs,
    jobName,
}: {
    query: QueryDsl;
    maxAgeMs: number;
    jobName: string;
}) => {
    const cutoffTs = new Date(Date.now() - maxAgeMs).toISOString();

    const hitsPerRepo = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: false,
        queryParams: {
            count: 5000,
            sort: 'publish.first DESC',
            query: {
                boolean: {
                    must: [
                        {
                            range: {
                                field: 'publish.first',
                                lt: cutoffTs,
                            },
                        },
                        query,
                    ],
                },
            },
        },
    });

    const result: ArchiveResult = {
        totalFound: 0,
        archived: [],
        skipped: [],
        failed: [],
    };

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        const layerRepo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });

        logger.info(
            `Found ${hits.length} candidate content in repo ${repoId} for archiving job ${jobName}`
        );

        const contents = hits.reduce<ContentDataSimple[]>((acc, contentId) => {
            const contentNode = layerRepo.get<Content>(contentId);
            if (contentNode) {
                acc.push(simplifyContent(contentNode, repoId));
            } else {
                logger.info(`Content for archiving: ${contentId} not found in repo ${repoId}`);
            }

            return acc;
        }, []);

        const layerResult = runInContext({ repository: repoId, asAdmin: true }, () =>
            unpublishAndArchiveContents(contents, repoId, cutoffTs)
        );

        result.totalFound += contents.length;
        result.failed.push(...layerResult.failed);
        result.skipped.push(...layerResult.skipped);
        result.archived.push(...layerResult.archived);
    });

    persistResultLogs(result, jobName, query);
};
