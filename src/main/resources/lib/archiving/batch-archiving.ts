import { QueryDsl } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getRepoConnection } from '../repos/repo-utils';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { MISC_REPO_ID, URLS } from '../constants';
import { buildEditorPath } from '../paths/editor-path';
import { getMiscRepoConnection } from '../repos/misc-repo';
import { ReferencesFinder } from '../reference-search/references-finder';
import { MainArticle } from '@xp-types/site/content-types';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { CONTENT_TYPES_WITH_CONTENT_LISTS } from '../contentlists/remove-unpublished';

type ContentDataSimple = Pick<
    Content,
    '_id' | '_path' | 'createdTime' | 'modifiedTime' | 'type' | 'displayName'
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
    archived: ContentDataSimple[];
};

const LOG_DIR = 'batch-archiving-logs';
const LOG_DIR_PATH = `/${LOG_DIR}`;

const contentTypeReferencesToIgnore: ReadonlySet<ContentDescriptor> = new Set(
    CONTENT_TYPES_WITH_CONTENT_LISTS
);

const simplifyContent = (content: Content, repoId: string): ContentDataSimple => {
    const { _id, _path, createdTime, modifiedTime, type, data, displayName } = content;

    return {
        _id,
        _path,
        displayName,
        editorUrl: `${URLS.PORTAL_ADMIN_ORIGIN}${buildEditorPath(_id, repoId)}`,
        createdTime,
        modifiedTime,
        type,
        subType: data.contentType,
        repoId,
        errors: [],
        references: [],
        archivedChildren: [],
    };
};

const persistResultLogs = (result: ArchiveResult, startTs: string, jobName: string) => {
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
            started: startTs,
            finished: now,
            jobName,
            totalFound: result.totalFound,
            totalFailed: result.failed.length,
            totalArchived: result.archived.length,
        },
        failed: result.failed,
        archived: result.archived,
    });

    logger.info(
        `Batch archiving result for ${logEntryName}: Total contents found ${result.totalFound} | Success count ${result.archived.length} | Failed count ${result.failed.length} - Full results: ${logEntryDataToolboxUrl}`
    );
};

const hasNewerDescendants = (content: ContentDataSimple | Content, timestamp: string): boolean => {
    const children = contentLib.getChildren({ key: content._id, count: 1000 });

    return children.hits.some(
        (child) =>
            (child.modifiedTime || child.createdTime) > timestamp ||
            hasNewerDescendants(child, timestamp)
    );
};

const getRelevantReferences = (content: ContentDataSimple, repoId: string) => {
    const references = new ReferencesFinder({
        contentId: content._id,
        repoId,
        logErrorsOnly: true,
    }).run();

    if (!references) {
        return [];
    }

    return references.reduce<ContentDataSimple[]>((acc, refContent) => {
        // References from certain content types are automatically fixed by an event handler on unpublish
        // and can safely be ignored
        if (!contentTypeReferencesToIgnore.has(refContent.type)) {
            acc.push(simplifyContent(refContent, repoId));
        }

        return acc;
    }, []);
};

const unpublishAndArchiveContents = (
    contents: ContentDataSimple[],
    repoId: string,
    cutoffTs: string
): ArchiveResult => {
    const contentToArchive: ContentDataSimple[] = [];
    const archivedContent: ContentDataSimple[] = [];
    const failedContent: ContentDataSimple[] = [];

    contents.forEach((content) => {
        const contentFinal: ContentDataSimple = {
            ...content,
            references: getRelevantReferences(content, repoId),
        };

        // Unpublishing a content will also unpublish all its descendants. If there are any descendants
        // which are newer than the cut-off timestamp that was set, we don't want to unpublish
        if (hasNewerDescendants(content, cutoffTs)) {
            contentFinal.errors.push(
                'Innholdet har under-innhold som er nyere enn tidsavgrensingen for arkivering'
            );
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
            sort: 'modifiedTime DESC',
            query: {
                boolean: {
                    must: [
                        {
                            range: {
                                field: 'modifiedTime',
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
        failed: [],
    };

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        const layerRepo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });

        logger.info(`Found ${hits.length} contents in repo ${repoId} for archiving job ${jobName}`);

        const contents = hits.reduce<ContentDataSimple[]>((acc, contentId) => {
            const contentNode = layerRepo.get<Content>(contentId);
            if (contentNode) {
                acc.push(simplifyContent(contentNode, repoId));
            }

            return acc;
        }, []);

        const layerResult = runInContext({ repository: repoId, asAdmin: true }, () =>
            unpublishAndArchiveContents(contents, repoId, cutoffTs)
        );

        result.totalFound += hits.length;
        result.failed.push(...layerResult.failed);
        result.archived.push(...layerResult.archived);
    });

    persistResultLogs(result, cutoffTs, jobName);
};
